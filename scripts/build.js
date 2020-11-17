const fs = require('fs')
const rollup = require('rollup')
const builds = require('./config').getAllBuilds()
const genConfig = require('./config').genConfig
const chalk = require('chalk');
const path = require('path')

if (process.argv.includes('-w')) {
    watchAll()
} else {
    buildAll()
}

function buildAll() {
    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist')
    }

    let i = 0
    build()

    function build() {
        const opt = builds[i]
        if (!opt) {
            return
        }
        rollup.rollup(opt)
            .then(bundle => bundle.generate(opt.output))
            .then(({ output: [{ code }] }) => {
                return new Promise((resolve, reject) => {
                    fs.writeFile(opt.output.file, code, err => {
                        if (err) return reject(err)
                        resolve()
                    })
                })
            })
            .then(() => {
                i++
                build()
            })
            .catch(error => console.log(error))
    }
}

function watchAll() {
    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist')
    }

    const watchOption = {
        input: builds[0].input,
        watch: {
            include: path.resolve(__dirname, '../', 'src/**')
        },
        output: {
            ...genConfig('iife').output,
            sourcemap: true
        }
    }

    const watcher = rollup.watch(watchOption)

    watcher.on('event', event => {
        const { code } = event
        switch (code) {
        case 'ERROR': {
            const { error } = event
            console.log(chalk.red(event.code))
            console.log(error, '\n')
            break;
        }
        case 'FATAL': {
            console.log(chalk.red(event.code))
            break;
        }
        default: {
            console.log(chalk.green(event.code))
        }
        }
    });
}
