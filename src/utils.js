export const isPC = !/ipad|iphone|midp|rv:1.2.3.4|ucweb|android|windows ce|windows mobile/.test(navigator.userAgent.toLowerCase())
export const dpr = window.devicePixelRatio

// 获取事件名称
export const enumEvents = (() => {
    if (!isPC) {
        return {
            start: 'touchstart',
            end: 'touchend',
            move: 'touchmove'
        }
    } else {
        return {
            start: 'mousedown',
            end: 'mouseup',
            move: 'mousemove',
            leave: 'mouseleave'
            // wheel: 'mousewheel'
        }
    }
})()

// 获取最高价
export function getHighPrice ({ rawData }) {
    return Math.max(...rawData.map(item => item.price))
}
// 获取最低价
export function getLowPrice ({ rawData }) {
    return Math.min(...rawData.map(item => item.price))
}

// 获取最高值
export function getHighestValue ({ closePrice, computedHighPrice, computedLowPrice }) {
    // (取 |最高价-开盘价|、|最低价-开盘价| 对应绝对值中的最高值)
    const highestValue = Math.max(Math.abs(computedHighPrice - closePrice), Math.abs(computedLowPrice - closePrice))

    return highestValue * 1.15
}

// 获取图表高度差值
export function getChartHeightDiff ({ closePrice, computedHighPrice, computedLowPrice }) {
    const { upperPoint, bottomPoint } = getCriticalValue({ closePrice, computedHighPrice, computedLowPrice })
    return upperPoint - bottomPoint
}

// 获取上下坐标点
export function getCriticalValue ({ closePrice, computedHighPrice, computedLowPrice }) {
    const highestValue = getHighestValue({ closePrice, computedHighPrice, computedLowPrice })
    // 上轴坐标点
    const upperPoint = closePrice + highestValue
    // 下轴坐标点
    const bottomPoint = closePrice - highestValue

    return {
        upperPoint,
        bottomPoint
    }
}

// 格式化数据
export function formatData (options) {
    const { rawData, zoomX, closePrice, computedHighPrice, computedLowPrice, size, tradingLength, debug } = options
    const scale = tradingLength <= size.containerWidth ? 1 : tradingLength / (size.containerWidth + 1)
    let result = []

    if (!rawData.length) {
        return []
    }
    const shownKlist = []
    let index = 0
    let hasLast = false
    const interval = Math.floor(scale)
    const remainder = scale % interval
    let sum = 0
    while (index < rawData.length) {
        shownKlist.push(rawData[index])
        if (index === rawData.length - 1) {
            hasLast = true
        }

        index = index + interval
        sum += remainder

        if (sum >= 1) {
            index += Math.floor(sum)
            sum = sum - Math.floor(sum)
        }
    }

    if (!hasLast) {
        shownKlist.push(rawData[rawData.length - 1])
    }

    result = shownKlist.map((item, i) => {
        return {
            ...item,
            x: priceToXAxis(i, zoomX),
            y: priceToYAxis(item.price, { closePrice, computedHighPrice, computedLowPrice, size })
        }
    })

    if (debug && result.length) {
        const times = result.map(item => {
            const date = new Date(item.time * 1000)
            const M = date.getMonth() + 1
            const D = date.getDate()
            const h = date.getHours()
            const m = date.getMinutes()
            const timeStr = `${M}/${D} ${h}:${m}`
            return [timeStr, item.time, item.price]
        })
        console.log({ times })
    }
    return result
}

// 价格转换y轴坐标
export function priceToYAxis (price, { closePrice, computedHighPrice, computedLowPrice, size }) {
    var heightDiff = getChartHeightDiff({ closePrice, computedHighPrice, computedLowPrice })
    const result = Math.round((1 - (price - closePrice + heightDiff / 2) / heightDiff) * size.areaCtxHeight)
    return result
}

// 任意y坐标计算对应的价格
export function yAxisToPrice (y, { closePrice, computedHighPrice, computedLowPrice, size }) {
    var heightDiff = getChartHeightDiff({ closePrice, computedHighPrice, computedLowPrice })

    return (1 - y / size.areaCtxHeight) * heightDiff - heightDiff / 2 + closePrice
}

// 价格转换x轴坐标
export function priceToXAxis (index, zoomX) {
    const result = index * zoomX
    return result
}

// 获取x坐标对应的数据
export function getCorssData ({ x, zoomX }, kList) {
    const index = Math.round(x / zoomX)
    return kList[index] ? kList[index] : null
}

// 获取焦点坐标
export const getCoordinate = (() => {
    if (isPC) {
        return function (e) { return { x: e.offsetX * dpr, y: e.offsetY * dpr } }
    } else {
        return function (e, size) {
            const x = (e.targetTouches[0].pageX - size.areaRect.left) * dpr
            const y = (e.targetTouches[0].pageY - size.areaRect.top) * dpr
            return { x, y }
        }
    }
})()

export function priceDigit (val, digit = 2) {
    if (/^(\-|\+)?\d+(\.\d+)?$/.test(val)) {
        return toFixed(val, digit)
    } else {
        return '- -'
    }
}

/** 四舍五入转化为指定小数位数，不足补0
 * @num num表示需要四舍五入的小数
 * @pNum s表示需要保留几位小数
 */
export function toFixed (num, s = 2) {
    const times = Math.pow(10, s)
    let des = 0
    if (num > 0) {
        des = num * times + 0.5
    } else {
        des = num * times - 0.5
    }
    des = parseInt(des, 10) / times
    return Number(des).toFixed(s)
}

export class Observer {
    constructor() {
        this._subscribers = {}
    }

    subscribe(type, func) {
        !this._subscribers[type] && (this._subscribers[type] = [])
        this._subscribers[type].push(func)
    }

    unSubscribe(type) {
        delete this._subscribers[type]
    }

    publish(type, data) {
        if (Array.isArray(this._subscribers[type])) {
            this._subscribers[type].forEach(cb => cb(data))
        }
    }
}
