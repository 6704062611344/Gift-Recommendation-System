const fs = require('fs');
const path = require('path');

const directoryPath = process.cwd();

function fixAllSlashes(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Replace all instances of icon\ with icon/ (using regex)
    content = content.replace(/icon\\/g, 'icon/');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated paths to forward slash in ${path.basename(filePath)}`);
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
            fixAllSlashes(fullPath);
        }
    }
}

walkDir(directoryPath);
console.log("Done fixing paths to use standard forward slash.");
