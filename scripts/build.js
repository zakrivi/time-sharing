const fs = require('fs')
const rollup = require('rollup')
const builds = require('./config').getAllBuilds()

buildAll()

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
