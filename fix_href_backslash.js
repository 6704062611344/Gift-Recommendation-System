const fs = require('fs');
const path = require('path');

const directoryPath = process.cwd();

function fixFaviconPaths(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Replace instances like href="icon\\surprise (1).png" with href="icon\surprise (1).png"
    // In JS regex, /href="icon\\\\/ matches href="icon\\
    // We replace it with 'href="icon\\' which evaluates to `href="icon\` in the string literal.
    content = content.replace(/href="icon\\\\/g, 'href="icon\\');

    // Just in case any other double backslash issues remain (like style="background: url('icon\\...')")
    content = content.replace(/(["'])icon\\\\/g, '$1icon\\');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed favicon double backslash in ${path.basename(filePath)}`);
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
            fixFaviconPaths(fullPath);
        }
    }
}

walkDir(directoryPath);
console.log("Done fixing favicon paths.");
