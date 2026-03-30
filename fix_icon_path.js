const fs = require('fs');
const path = require('path');

const directoryPath = process.cwd();

function fixIconPaths(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Replace instances like src="icon/name.png" with src="icon\name.png"
    // We use a regex to match src="icon/
    content = content.replace(/src="icon\//g, 'src="icon\\\\');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated paths in ${path.basename(filePath)}`);
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
            fixIconPaths(fullPath);
        }
    }
}

walkDir(directoryPath);
console.log("Done fixing icon paths.");
