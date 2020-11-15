import { getCoordinate, getCorssData, dpr } from './utils'
import { storage } from './storage'

// 横坐标图
export class InitXAxis {
    constructor (options) {
        this._canvas = storage.getConfig().nodes.xAxis
        this._canvas.style.cssText = 'position: absolute;top: 0;left: 0;width: 100%;height: 100%;'

        this.ctx = this._canvas.getContext('2d')

        this._options = options
        this._crossE = 0
        this.isShowCross = false
        this.draw()
    }

    draw (e) {
        const { ctx } = this
        ctx.clearRect(0, 0, storage.getConfig().size.areaCtxWidth, this._canvas.height)

        ctx.save()
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, storage.getConfig().size.areaCtxWidth, storage.getConfig().size.areaCtxHeight)

        // 渲染横坐标
        if (storage.getConfig().startTime) {
            this._drawPoint({
                x: 0,
                time: storage.getConfig().startTime,
                textAlign: 'left',
                offsetX: 2
            })
        }
        if (storage.getConfig().endTime) {
            this._drawPoint({
                x: this._canvas.width - 1,
                time: storage.getConfig().endTime,
                textAlign: 'right',
                offsetX: -2
            })
        }
        ctx.restore()

        e && (this._crossE = e)
        this.isShowCross && (e || this._crossE) && this._drawCrossValue(e)
    }

    // 绘画单个坐标点
    _drawPoint (options) {
        const { ctx } = this
        const { textAlign = 'center', x, time, offsetX } = options
        ctx.save()
        ctx.beginPath()
        ctx.translate(0.5, 0.5)
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 4 * dpr)
        ctx.strokeStyle = '#505361'
        ctx.lineWidth = 1 * dpr
        ctx.stroke()

        // 时间显示
        const M = ('0' + (new Date(time).getMonth() + 1)).substr(-2)
        const d = ('0' + new Date(time).getDate()).substr(-2)
        const h = ('0' + new Date(time).getHours()).substr(-2)
        const m = ('0' + new Date(time).getMinutes()).substr(-2)
        ctx.font = storage.getConfig().font.normal
        ctx.fillStyle = '#505361'
        ctx.textAlign = textAlign
        ctx.fillText(`${M}/${d} ${h}:${m}`, x + offsetX * dpr, 20 * dpr)
        ctx.restore()
    }

    // 绘画十字光标对应的x值
    _drawCrossValue (e) {
        const { size, kList, zoomX } = storage.getConfig()
        const coordinate = getCoordinate(e || this._crossE, size)
        const x = Math.round(coordinate.x)

        const { ctx } = this
        const target = getCorssData({ x, zoomX }, kList)
        if (!target) {
            return
        }
        const { time } = target
        const positionX = Math.floor(x - 40 * dpr)
        const rectWidth = 80 * dpr
        const rectMinX = 0
        const rectMaxX = size.areaCtxWidth - rectWidth
        const rectX = Math.floor(positionX >= 0 ? (positionX <= rectMaxX ? positionX : rectMaxX) : rectMinX)
        const textX = rectX + 8 * dpr
        ctx.save()
        // 矩形框
        ctx.fillStyle = 'rgb(76,82,94)'
        ctx.fillRect(rectX, 0, rectWidth, 15 * dpr)
        // 文字
        const M = ('0' + (new Date(time * 1000).getMonth() + 1)).substr(-2)
        const d = ('0' + new Date(time * 1000).getDate()).substr(-2)
        const h = ('0' + new Date(time * 1000).getHours()).substr(-2)
        const m = ('0' + new Date(time * 1000).getMinutes()).substr(-2)
        ctx.font = storage.getConfig().font.normal
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'left'
        ctx.fillText(`${M}/${d} ${h}:${m}`, textX, 11 * dpr)
        ctx.restore()
    }
}
