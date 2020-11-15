export default {
    input: 'src/index.js',
    output: {
        file: 'dist/bundle.min.js',
        format: 'umd',
        name: 'tslib',
        sourcemap: true
    }
};
