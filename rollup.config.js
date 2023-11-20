import nodeResolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

export default {
  plugins: [
    nodeResolve({
      jsnext: true, // Default: false
      main: true, // Default: true
      browser: true, // Default: false
    }),
  ],
  input: 'src/spytext.js',
  output: [{
    file: 'dist/spytext.js',
    format: 'esm',
    name: 'spytext',
    sourcemap: true,
  }, {
    file: 'dist/spytext.min.js',
    format: 'esm',
    name: 'spytext',
    sourcemap: true,
    plugins: [ terser() ]
  }],
}
