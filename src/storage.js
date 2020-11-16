'use strict'
import { dpr } from './utils'
// 配置类
class Storage {
    constructor() {
        if (!Storage._instance) {
            this.init()
            Storage._instance = this
        }

        return Storage._instance
    }

    // 初始化参数
    init() {
        this._config = getDefaultConfig()
    }

    // 更新参数
    update(options) {
        Object.keys(options).forEach(key => {
            this._config[key] = options[key]
        })
    }

    getConfig() {
        return this._config
    }
}

function getDefaultConfig () {
    return {
        zoomX: 1 / dpr,
        rawData: [],
        kList: [],
        highPrice: null,
        lowPrice: null,
        closePrice: null,
        digit: 2,
        startTime: '',
        endTime: '',
        tradingLength: 0, // 交易时段计算出的数据总条数
        size: {
            containerWidth: null, // 容器的宽度
            areaCtxWidth: null, // 图区上下文宽度
            areaCtxHeight: null // 图区上下文高度
        },
        font: {
            normal: `${12 * dpr}px sans-serif`
        },
        colors: {
            up: '',
            down: ''
        },
        nodes: {}
    }
}

export const storage = new Storage()