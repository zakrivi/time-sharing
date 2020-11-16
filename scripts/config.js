
const path = require('path')
const { terser } = require('rollup-plugin-terser')
const babel = require('@rollup/plugin-babel').default

const builds = {
    es: {
        dest: 'dist/time-sharing.esm.js',
        format: 'es'
    },
    iife: {
        dest: 'dist/time-sharing.min.js',
        format: 'iife',
        name: 'timeSharing',
        plugins: [babel({ babelHelpers: 'bundled' }), terser()]
    }
}

function resolvePath(p) {
    return path.resolve(__dirname, '../', p)
}

function genConfig (key) {
    const { dest, format, plugins = [], name } = builds[key]
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

exports.genConfig = genConfig
exports.getAllBuilds = () => Object.keys(builds).map(genConfig)
