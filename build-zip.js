const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('project.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function () {
  console.log('project.zip created:', archive.pointer(), 'bytes');
});

archive.on('error', function (err) {
  throw err;
});

archive.pipe(output);

archive.glob('**/*', { ignore: ['node_modules/**', '.git/**', 'project.zip'] });

archive.finalize();
