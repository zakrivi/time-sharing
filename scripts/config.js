
const path = require('path')
const { terser } = require('rollup-plugin-terser')
const babel = require('@rollup/plugin-babel').default

const builds = [
    {
        dest: 'dist/time-sharing.esm.js',
        format: 'es'
    },
    {
        dest: 'dist/time-sharing.min.js',
        format: 'iife',
        name: 'timeSharing',
        plugins: [babel({ babelHelpers: 'bundled' }), terser()]
    }
]

function resolvePath(p) {
    return path.resolve(__dirname, '../', p)
}

function genConfig (options) {
    const { dest, format, plugins = [], name } = options
    return {
        input: resolvePath('src/index.js'),
        output: {
            file: resolvePath(dest),
            format,
            name: name || 'time-sharing'
        },
        plugins
    }
}

exports.getAllBuilds = () => builds.map(genConfig)
