import { getCoordinate, getCorssData, getCriticalValue, priceDigit, yAxisToPrice, dpr } from './utils'
import { storage } from './storage'
// 面积图
export class InitArea {
    constructor (options) {
        this._init(options)
        // this.draw()
    }

    _init (options) {
        this._canvas = storage.getConfig().nodes.area
        this._canvas.style.cssText = 'position: absolute;top: 0;left: 0;width: 100%;height: 100%;'

        this._options = options
        this.ctx = this._canvas.getContext('2d')
    }

    draw () {
        if (storage.getConfig().kList.length === 0) {
            return
        }

        const { ctx } = this

        ctx.clearRect(0, 0, storage.getConfig().size.areaCtxWidth, storage.getConfig().size.areaCtxHeight)

        // 绘制背景色
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, storage.getConfig().size.areaCtxWidth, storage.getConfig().size.areaCtxHeight)

        ctx.save()

        // 绘制曲线
        ctx.beginPath()
        ctx.lineWidth = 1 * dpr
        storage.getConfig().kList.forEach((item, i) => {
            ctx.lineTo(item.x, item.y)
        })
        ctx.strokeStyle = 'rgb(71, 127, 211)'
        ctx.stroke()

        ctx.lineTo(storage.getConfig().kList[storage.getConfig().kList.length - 1].x, storage.getConfig().size.areaCtxHeight)
        // 路径闭合
        storage.getConfig().kList.length && ctx.lineTo(storage.getConfig().kList[0].x, storage.getConfig().size.areaCtxHeight)

        // 渐变色
        const gradient = ctx.createLinearGradient(0, 0, 0, storage.getConfig().size.areaCtxHeight)
        gradient.addColorStop(0, 'rgba(61,114,228,0.5)')
        gradient.addColorStop(1, 'rgba(61,114,228,0.01)')
        ctx.fillStyle = gradient
        ctx.fill()
        ctx.restore()

        this._drawOpenLine()
        this._drawPoint()
    }

    // 中轴线(当天开盘价)
    _drawOpenLine () {
        const { ctx } = this
        const y = Math.round(storage.getConfig().size.areaCtxHeight / 2)
        ctx.save()
        ctx.beginPath()
        ctx.translate(0.5, 0.5)
        ctx.lineWidth = 1 * dpr
        ctx.moveTo(0, y)
        ctx.lineTo(storage.getConfig().size.areaCtxWidth, y)
        ctx.setLineDash([4 * dpr, 4 * dpr]) // [实线长度, 间隙长度]
        ctx.lineDashOffset = 0
        ctx.strokeStyle = 'rgba(200, 200, 200, 1)'
        ctx.stroke()

        ctx.font = storage.getConfig().font.normal
        ctx.textAlign = 'left'
        ctx.fillStyle = '#666'
        ctx.fillText(priceDigit(storage.getConfig().closePrice, storage.getConfig().digit), 12 * dpr, storage.getConfig().size.areaCtxHeight / 2 - 5 * dpr)

        ctx.textAlign = 'right'
        ctx.fillStyle = '#aaa'
        ctx.fillText(priceDigit(0, 2) + '%', storage.getConfig().size.areaCtxWidth - 12 * dpr, storage.getConfig().size.areaCtxHeight / 2 - 5 * dpr)

        ctx.restore()
    }

    // 上下坐标点、涨跌幅
    _drawPoint () {
        const { ctx } = this
        const { closePrice, size, digit, colors, computedHighPrice, computedLowPrice } = storage.getConfig()
        const { upperPoint, bottomPoint } = getCriticalValue({ closePrice, computedHighPrice, computedLowPrice })
        const upperChange = (upperPoint - closePrice) / closePrice * 100
        const bottomChange = (bottomPoint - closePrice) / closePrice * 100

        ctx.save()
        ctx.font = storage.getConfig().font.normal

        ctx.fillStyle = colors.up
        ctx.textAlign = 'left'
        ctx.fillText(priceDigit(upperPoint, digit), 12 * dpr, 16 * dpr)
        ctx.textAlign = 'right'
        ctx.fillText(priceDigit(upperChange, 2) + '%', size.areaCtxWidth - 12 * dpr, 16 * dpr)

        ctx.fillStyle = colors.down
        ctx.textAlign = 'left'
        ctx.fillText(priceDigit(bottomPoint, digit), 12 * dpr, size.areaCtxHeight - 6 * dpr)
        ctx.textAlign = 'right'
        ctx.fillText(priceDigit(bottomChange, 2) + '%', size.areaCtxWidth - 12 * dpr, size.areaCtxHeight - 6 * dpr)

        ctx.restore()
    }
}

// 面积交互
export class InitCorss {
    constructor (options) {
        this._canvas = storage.getConfig().nodes.areaCross
        this._canvas.style.cssText = 'position: absolute;top: 0;left: 0;width: 100%;height: 100%;'
        this.ctx = this._canvas.getContext('2d')

        this._options = options

        this._crossE = null
        this.isShowCross = false
        // this._drawRound()
    }

    draw (e) {
        e && (this._crossE = e)
        this.ctx.clearRect(0, 0, storage.getConfig().size.areaCrossCtxWidth, storage.getConfig().size.areaCrossCtxHeight)
        this.isShowCross && (e || this._crossE) && this._drawCrossLine(e)
    }

    // 绘画十字线
    _drawCrossLine (e) {
        const { ctx } = this
        const { digit, closePrice, size, font, computedHighPrice, computedLowPrice } = storage.getConfig()
        const coordinate = getCoordinate(e || this._crossE, size)
        const x = Math.round(coordinate.x)
        const y = Math.round(coordinate.y)

        ctx.save()
        ctx.beginPath()
        ctx.translate(0.5 / dpr, 0.5 / dpr)
        ctx.setLineDash([5 * dpr, 8 * dpr]) // [实线长度, 间隙长度]
        ctx.lineDashOffset = 0
        ctx.lineWidth = 1 * dpr
        ctx.strokeStyle = '#000'
        ctx.moveTo(0, y)
        ctx.lineTo(size.areaCrossCtxWidth, y)
        ctx.moveTo(x, 0)
        ctx.lineTo(x, storage.getConfig().size.areaCrossCtxHeight)
        ctx.stroke()
        ctx.restore()

        const price = priceDigit(yAxisToPrice(y, { closePrice, computedHighPrice, computedLowPrice, size }), digit)
        const priceChange = priceDigit((price - closePrice) / closePrice * 100, 2) + '%'
        ctx.save()
        ctx.beginPath()
        ctx.font = font.normal
        ctx.textAlign = 'left'
        ctx.fillStyle = '#333'
        ctx.fillText(price, 12 * dpr, y - 4 * dpr)

        ctx.beginPath()
        ctx.font = font.normal
        ctx.textAlign = 'right'
        ctx.fillStyle = '#333'
        ctx.fillText(priceChange, size.areaCrossCtxWidth - 12 * dpr, y - 5 * dpr)
        ctx.restore()
        this._drawColumnPrice(e)
    }

    // 对应列的价格显示
    _drawColumnPrice (e) {
        const { ctx } = this
        const { size, kList, closePrice, zoomX } = storage.getConfig()
        const coordinate = getCoordinate(e || this._crossE, size)
        const x = coordinate.x
        const target = getCorssData({ x, zoomX }, kList)
        if (!target) {
            return
        }

        const { price } = target
        const y = target.y

        ctx.save()
        ctx.translate(0.5, 0.5)
        ctx.beginPath()
        ctx.lineWidth = 1 * dpr
        ctx.arc(x, y, 3 * dpr, 0, Math.PI * 2, false)
        ctx.fillStyle = '#f6822f'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(size.areaCrossCtxWidth, y)
        ctx.setLineDash([5 * dpr, 5 * dpr]) // [实线长度, 间隙长度]
        ctx.lineDashOffset = 0
        ctx.strokeStyle = '#f6822f'
        ctx.stroke()

        ctx.font = storage.getConfig().font.normal
        ctx.fillStyle = '#f6822f'
        ctx.textAlign = 'center'
        ctx.fillText(price, 30 * dpr, y - 5 * dpr)

        const priceChange = (price - closePrice) / closePrice * 100
        ctx.textAlign = 'right'
        ctx.fillText(priceDigit(priceChange, 2) + '%', size.areaCrossCtxWidth - 12 * dpr, y - 5 * dpr)

        ctx.restore()
    }

    _drawRound () {
        const { ctx } = this
        let zoom = 2
        let direction = 1
        drawRound.call(this, zoom)

        function drawRound () {
            const leng = storage.getConfig().kList.length
            if (leng) {
                const { x, y, time: lastTime } = storage.getConfig().kList[leng - 1]
                const { endTime } = storage.getConfig()
                if (lastTime >= Math.floor(endTime / Math.pow(10, 6) - endTime / Math.pow(10, 6) % 60)) {
                    // 休市停止闪烁
                    return
                }

                ctx.save()
                ctx.beginPath()
                ctx.fillStyle = 'rgba(71, 127, 211, 1)'
                ctx.arc(x, y, 2 * dpr, 0, Math.PI * 2, true)
                ctx.fill()
                ctx.restore()

                ctx.save()
                ctx.fillStyle = 'rgba(71, 127, 211, 0.28)'
                ctx.arc(x, y, zoom * dpr, 0, Math.PI * 2, true)
                ctx.fill()
                ctx.restore()

                if (zoom > 9) {
                    zoom = 9
                    direction *= -1
                } else if (zoom < 2) {
                    zoom = 2
                    direction *= -1
                }

                zoom += direction * zoom / 40
            }

            requestAnimationFrame(() => {
                this.draw()
                drawRound.call(this, zoom)
            })
        }
    }
}
