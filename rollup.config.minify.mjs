import terser from '@rollup/plugin-terser'
import config from './rollup.config.mjs'

config.output.file = config.output.file.replace(/js$/, 'min.js')
config.plugins = config.plugins.concat(terser())

export default config
