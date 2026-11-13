import { NextRequest, NextResponse } from 'next/server';
import { getInsforgeServerClient } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const EMOJI_WEIGHTS: Record<string, number> = {
  '🔥': 20,
  '🚀': 20,
  '💎': 20,
  '🐂': 20,
  '🌙': 20,
  '💩': -50,
  '📉': -50,
  '💀': -50,
  '🐻': -30,
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const voiceFile = formData.get('voice') as File | null;
    const emoji = (formData.get('emoji') as string) || '🔥';
    const tokenMint = (formData.get('token_mint') as string) || '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS';
    const sensorDataStr = (formData.get('sensor_data') as string) || '{}';
    const userPubkey = (formData.get('user_pubkey') as string) || 'ANON';

    let sensorData: any = {};
    try {
      sensorData = typeof sensorDataStr === 'string' ? JSON.parse(sensorDataStr) : sensorDataStr;
    } catch {
      sensorData = {};
    }

    const avgVolume = typeof sensorData.avg_volume === 'number' ? sensorData.avg_volume : 0.45;
    const accel = typeof sensorData.accel_magnitude === 'number' ? sensorData.accel_magnitude : 0.5;
    const energy = Math.min(100, Math.max(0, ((avgVolume + accel) / 2) * 100));

    const insforge = getInsforgeServerClient();

    // 1. Process Voice Upload (if file provided)
    let voiceUrl: string | null = null;
    let voiceBuffer: ArrayBuffer | null = null;
    let mimeType = 'audio/webm';
    let extension = 'webm';

    if (voiceFile && typeof (voiceFile as any).arrayBuffer === 'function') {
      try {
        voiceBuffer = await voiceFile.arrayBuffer();
        if (voiceFile.type) {
          if (voiceFile.type.includes('mp4') || voiceFile.type.includes('m4a')) {
            extension = 'm4a';
            mimeType = 'audio/mp4';
          } else if (voiceFile.type.includes('wav')) {
            extension = 'wav';
            mimeType = 'audio/wav';
          } else if (voiceFile.type.includes('mpeg') || voiceFile.type.includes('mp3')) {
            extension = 'mp3';
            mimeType = 'audio/mpeg';
          }
        }

        if (voiceBuffer.byteLength > 0) {
          const uniqueKey = `vibes/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
          const voiceBlob = new Blob([voiceBuffer], { type: mimeType });
          const { data: uploadData } = await insforge.storage.from('vibes').upload(uniqueKey, voiceBlob);
          if (uploadData?.url) {
            voiceUrl = uploadData.url;
          }
        }
      } catch (uploadErr) {
        console.warn('[submit-vibe] Storage upload skipped/failed:', uploadErr);
      }
    }

    // 2. Transcription via Groq Whisper (if API key present)
    const groqApiKey = process.env.GROQ_API_KEY;
    let rawTranscript = 'Verified vocal & physical vibration sentiment stream';
    let excitementScore = 65;

    if (groqApiKey && voiceBuffer && voiceBuffer.byteLength > 1000) {
      try {
        const transcribeForm = new FormData();
        transcribeForm.append('file', new Blob([voiceBuffer], { type: mimeType }), `audio.${extension}`);
        transcribeForm.append('model', 'whisper-large-v3');
        transcribeForm.append('response_format', 'text');

        const transcribeRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${groqApiKey}` },
          body: transcribeForm,
        });

        if (transcribeRes.ok) {
          const transcriptText = await transcribeRes.text();
          if (transcriptText && transcriptText.trim().length > 0) {
            rawTranscript = transcriptText.trim();

            // Run sentiment analysis
            const aiPrompt = `Analyze crypto hype sentiment from this transcript: "${rawTranscript}", emoji: "${emoji}". Output JSON ONLY with "score" (0-100), e.g. {"score": 85}.`;
            const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: aiPrompt }],
                response_format: { type: 'json_object' },
                temperature: 0.1,
              }),
            });

            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const parsed = JSON.parse(aiData.choices?.[0]?.message?.content || '{}');
              if (typeof parsed.score === 'number') {
                excitementScore = parsed.score;
              }
            }
          }
        }
      } catch (groqErr) {
        console.warn('[submit-vibe] Groq audio processing fallback:', groqErr);
      }
    }

    // 3. Fallback excitement calibration based on acoustic & physical vibe
    if (excitementScore === 65) {
      if (['🔥', '🚀', '🐂', '💎'].includes(emoji)) {
        excitementScore = 75 + Math.min(20, Math.round(energy * 0.2));
      } else if (['💩', '📉', '💀', '🐻'].includes(emoji)) {
        excitementScore = 30 - Math.min(20, Math.round(energy * 0.15));
      } else {
        excitementScore = 55 + Math.round(energy * 0.15);
      }
    }

    // 4. Exact Protocol Scoring Formula
    const emojiWeight = EMOJI_WEIGHTS[emoji] || 0;
    let totalScore = excitementScore * 0.6 + energy * 0.3 + emojiWeight;

    // Check Staking Multiplier
    try {
      const { data: stakingData } = await insforge.database
        .from('user_staking')
        .select('staked_amount')
        .eq('user_pubkey', userPubkey)
        .maybeSingle();

      if (stakingData && typeof (stakingData as any).staked_amount === 'number' && (stakingData as any).staked_amount > 0) {
        const stakedAmount = Number((stakingData as any).staked_amount);
        const boostPercent = Math.min(0.5, stakedAmount / 1_000_000);
        totalScore = totalScore * (1 + boostPercent);
      }
    } catch {}

    const finalScore = Math.min(99.5, Math.max(12.0, parseFloat(totalScore.toFixed(1))));

    // 5. Database Persistence
    try {
      await insforge.database.from('vibes_raw').insert({
        token_mint: tokenMint,
        user_pubkey: userPubkey,
        voice_file_url: voiceUrl,
        emoji,
        sensor_data: sensorData,
        raw_transcript: rawTranscript,
      });

      // Update aggregate score
      const { data: currentScore } = await insforge.database
        .from('vibe_scores')
        .select('score, contributor_count')
        .eq('token_mint', tokenMint)
        .maybeSingle();

      let nextScore = finalScore;
      let nextCount = 1;

      if (currentScore) {
        nextCount = (currentScore.contributor_count || 0) + 1;
        nextScore = parseFloat((((currentScore.score * currentScore.contributor_count) + finalScore) / nextCount).toFixed(1));
      }

      await insforge.database.from('vibe_scores').upsert({
        token_mint: tokenMint,
        score: nextScore,
        contributor_count: nextCount,
        updated_at: new Date().toISOString(),
      });

      // Record XP reward for contributor
      if (userPubkey && userPubkey !== 'ANON') {
        try {
          const { data: profile } = await insforge.database
            .from('community_profiles')
            .select('xp, total_contributions')
            .eq('user_pubkey', userPubkey)
            .maybeSingle();

          if (profile) {
            await insforge.database
              .from('community_profiles')
              .update({
                xp: (profile.xp || 0) + 250,
                total_contributions: (profile.total_contributions || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('user_pubkey', userPubkey);
          }
        } catch {}
      }
    } catch (dbErr) {
      console.warn('[submit-vibe] Database persistence partial failure:', dbErr);
    }

    return NextResponse.json({
      success: true,
      vibeScore: finalScore,
      rawTranscript,
      message: finalScore >= 80 ? 'BULLISH SENSORY HYPED! Autonomous trigger armed.' : 'Sensory vibe logged and calibrated.',
    });
  } catch (error: any) {
    console.error('[submit-vibe] Fatal handler error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to process sensory payload.',
      },
      { status: 500 }
    );
  }
}

