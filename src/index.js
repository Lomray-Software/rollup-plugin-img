import { statSync, readFileSync, createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { extname, basename  } from 'path';
import { createFilter } from 'rollup-pluginutils';
import hasha from 'hasha';

const mimeMap = {
	'.jpg':  'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png':  'image/png',
	'.gif':  'image/gif',
	'.svg':  'image/svg+xml'
};

function img(opt = {}) {
	const extensions = opt.extensions || /\.(png|jpg|jpeg|gif|svg)$/;
	const extraExtensions = opt.extraExtensions || null;
	const filter = createFilter(opt.include, opt.exclude);

	return {
		name: 'image',
		load(id) {
			if (!filter(id)) return null;

			const ext = extname(id);
			const isExtraAllowedFile = extraExtensions && extraExtensions.test(ext);
			const isAllowedFile = extensions && extensions.test(ext);

			if (!isExtraAllowedFile && !isAllowedFile) return null; // not an image or other type file

      if (isAllowedFile && statSync(id).size <= (opt.limit || 8192)) { // use base64
				return `export default "data:${mimeMap[ext]};base64,${readFileSync(id, 'base64')}"`;
      } else { //copy file to distPath
		let name = basename(id);
		var outputRelative = path.relative('./', opt.output || '') || '';
		const output = opt.outputPathHandler ? opt.outputPathHandler(id, name, outputRelative) : outputRelative;

        if (!existsSync(output)) {
          const dirs = output.split('/');
          for (let i = 0, dir = dirs[0]; i < dirs.length; i++, dir += `/${dirs[i]}`) {
            if (dir !== '' && !existsSync(dir)) {
              mkdirSync(dir)
            }
          }
        }

        if (opt.hash) {
          const code = readFileSync(id).toString();
          const hash = hasha(code, { algorithm: 'md5' });
          name =  `${basename(id, ext)}-${hash}${ext}`;
        }

		const outputFile = `${output}/${name}`;
		let baseIndex = outputFile.indexOf('/');

		baseIndex = baseIndex !== -1 ? baseIndex + 1 : 0;
        createReadStream(id).pipe(createWriteStream(output));

		const fileDest = outputFile.slice(baseIndex);
		const exportString = (opt._slash ? './' : '') + (opt.pathHandler ? opt.pathHandler(fileDest, name, id) : fileDest);
		const addRequire = opt.addRequire && isAllowedFile || opt.addExtraRequire && isExtraAllowedFile;

		return `export default ${addRequire ? 'require(' : ''}"${exportString}"${addRequire ? ')' : ''}`;
      }
		}
	};
}

export default img;
