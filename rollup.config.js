import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

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
    commonjs({
      include: 'node_modules/**', // Default: undefined
      exclude: ['node_modules/dollr/es/**', 'node_modules/lodash-es/**'], // Default: undefined
      sourceMap: false, // Default: true
    }),
  ],
  entry: 'src/spytext.js',
  format: 'umd',
  moduleName: 'Spytext',
}
