import babel from '@rollup/plugin-babel'
import nodeResolve from '@rollup/plugin-node-resolve'

export default {
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
    nodeResolve({
      jsnext: true, // Default: false
      main: true, // Default: true
      browser: true, // Default: false
    }),
  ],
  input: 'src/spytext.js',
  output: {
    file: `dist/spytext.js`,
    format: 'umd',
    name: 'selektr',
    sourcemap: true,
  },
}
