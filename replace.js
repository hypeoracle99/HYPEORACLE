const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
const REPLACEMENTS = [
    ['process.env.NEXT_PUBLIC_INSFORGE_URL!', '"https://9s8ct2b5.us-east.insforge.app"'],
    ['process.env.NEXT_PUBLIC_INSFORGE_URL', '"https://9s8ct2b5.us-east.insforge.app"'],
    ['process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!', '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDEzNjl9.Cm7dzmsTq0k1LYT2n9R-S2LgnRBG1vOTsZoJ9R8DNXY"'],
    ['process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY', '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDEzNjl9.Cm7dzmsTq0k1LYT2n9R-S2LgnRBG1vOTsZoJ9R8DNXY"'],
    ['process.env.NEXT_PUBLIC_BAGS_API_KEY || \'\'', '"bags_prod_8lR0OnUDXzqmRKoWBXV5p14Blh8OsiKWuHgIgc2rook"'],
    ['process.env.NEXT_PUBLIC_BAGS_API_KEY', '"bags_prod_8lR0OnUDXzqmRKoWBXV5p14Blh8OsiKWuHgIgc2rook"'],
    ['process.env.NEXT_PUBLIC_APP_URL', '"https://9s8ct2b5.insforge.site"']
];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;
    for (const [key, value] of REPLACEMENTS) {
        if (content.includes(key)) {
            content = content.split(key).join(value);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(f, content, 'utf8');
        console.log(`Replaced in ${f}`);
    }
});
