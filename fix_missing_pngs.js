const fs = require('fs');
const path = require('path');

const directoryPath = process.cwd();

const replacements = {
    'icon-dashboard.png': 'icon\\\\home (1).png',
    'icon-gifts.png': 'icon\\\\package (1).png',
    'icon-categories.png': 'icon\\\\categories.png',
    'icon-rules.png': 'icon\\\\setting (1).png',
    'icon-vocabulary.png': 'icon\\\\book.png',
    'icon-admin.png': 'icon\\\\group (1).png',
    'icon-logout.png': 'icon\\\\enter (1).png',
    '"surprise(1).png"': '"icon\\\\surprise (1).png"' // some use "surprise(1).png" at the root
};

function fixMissingPngs(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    for (const [search, replace] of Object.entries(replacements)) {
        content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Replaced fake icons in ${path.basename(filePath)}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'icon') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (file.endsWith('.html')) {
            fixMissingPngs(fullPath);
        }
    }
}

walkDir(directoryPath);
console.log("Done fixing missing PNGs.");
