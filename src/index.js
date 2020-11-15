import { InitArea, InitCorss } from './area'
import { InitXAxis } from './xAxis'
import { enumEvents, getCoordinate, formatData, getCorssData, dpr, Observer } from './utils'
import { storage } from './storage'

export class InitChart {
    constructor (args) {
        // 更新配置
        storage.update({
            ...args.config,
            highPrice: args.highPrice,
            lowPrice: args.lowPrice,
            closePrice: args.closePrice,
            digit: args.digit,
            nodes: {
                container: document.createElement('div'),
                area: document.createElement('canvas'),
                areaCross: document.createElement('canvas'),
                xAxis: document.createElement('canvas')
            }
        })

        // 初始化
        this._init()
        this._initDOM(args.el)
        this.updateChart()
    }

    _init () {
        this._instance = {
            // 面积图
            area: new InitArea(),
            // 面积图交互层
            areaCross: new InitCorss(),
            // 横坐标图
            xAxis: new InitXAxis()
        }

        this._observer = new Observer()

        // 绑定事件(面积图交互层#area-cross)
        this._bindEventForAreaCross()

        window.addEventListener('resize', this.updateChart.bind(this))
    }

    // 渲染DOM节点
    _initDOM (elmId) {
        const { nodes } = storage.getConfig()

        nodes.container.id = 'wrap'
        nodes.container.style.cssText = 'position: relative;width: 100%;height: 100%;display:flex;flex-direction:column;'

        const areaParentElm = document.createElement('div')
        areaParentElm.id = 'areaParentElm'
        areaParentElm.style.cssText = 'position: relative;width: 100%;user-select: none;flex: 1;cursor: crosshair;'
        areaParentElm.appendChild(nodes.area)
        areaParentElm.appendChild(nodes.areaCross)

        const xAxisParentElm = document.createElement('div')
        xAxisParentElm.id = 'xAxisParentElm'
        xAxisParentElm.style.cssText = 'width: 100%;user-select: none;position: relative;flex:0 0 28px;height: 28px;border-top: 1px solid #505361;box-sizing: border-box;'
        xAxisParentElm.appendChild(nodes.xAxis)

        nodes.container.appendChild(areaParentElm)
        nodes.container.appendChild(xAxisParentElm)

        // 渲染到页面
        document.querySelector(elmId).appendChild(nodes.container)
    }

    _bindEventForAreaCross () {
        const areaCross = storage.getConfig().nodes.areaCross

        /* mousedown/touchstart */
        areaCross.addEventListener(enumEvents.start, e => {
            e.preventDefault()
            e.stopPropagation()

            this._observer.publish(enumEvents.start)
        })
        /* mousedown/touchstart */

        /* mousemove/touchmove */
        // 左右平移
        areaCross.addEventListener(enumEvents.move, e => {
            e.preventDefault()
            e.stopPropagation()

            this._instance.areaCross.isShowCross = true
            this._instance.xAxis.isShowCross = true

            this._handleHorizontalScroll(e)

            const { zoomX, kList } = storage.getConfig()
            const target = getCorssData({ x: getCoordinate(e, storage.getConfig().size).x, zoomX }, kList)
            this._observer.publish(enumEvents.move, target || null)
        })
        /* mousemove/touchmove */

        /* mouseup */
        areaCross.addEventListener(enumEvents.end, e => {
            this._instance.areaCross.isShowCross = false
            this._instance.xAxis.isShowCross = false

            this._observer.publish(enumEvents.end)

            this.updateChart()
        })
        /* mouseup */

        /* mouseleave */
        if (enumEvents.leave) {
            areaCross.addEventListener(enumEvents.leave, e => {
                this._instance.areaCross.isShowCross = false
                this._instance.xAxis.isShowCross = false
                this._handleMouseLeave()
                this._observer.publish(enumEvents.leave)
                this.updateChart()
            })
        }
        /* mouseleave */
    }

    // 鼠标离开
    _handleMouseLeave () {
        this._instance.areaCross.draw()
        this._instance.xAxis.draw()
    }

    // 水平拖动
    _handleHorizontalScroll (e) {
        this._instance.areaCross.draw(e)
        this._instance.xAxis.draw(e)
    }

    _updateSize () {
        const { container, area, areaCross, xAxis } = storage.getConfig().nodes;
        const containerRect = container.getBoundingClientRect()
        const areaRect = area.getBoundingClientRect()
        const areaCrossRect = areaCross.getBoundingClientRect()
        const xAxisRect = xAxis.getBoundingClientRect();

        ;[area, areaCross, xAxis].forEach(node => this._initSize(node))

        const size = {
            areaRect,
            containerWidth: Math.floor(containerRect.width),
            areaCtxWidth: Math.floor(areaRect.width * dpr),
            areaCtxHeight: Math.floor(areaRect.height * dpr),

            areaCrossCtxWidth: Math.floor(areaCrossRect.width * dpr),
            areaCrossCtxHeight: Math.floor(areaCrossRect.height * dpr),

            xAxisCtxWidth: Math.floor(xAxisRect.width * dpr),
            xAxisCtxHeight: Math.floor(xAxisRect.height * dpr)
        }

        // 初始化配置
        storage.update({
            size,
            zoomX: this._getZoomX()
        })

        storage.update({
            kList: formatData(storage.getConfig())
        })
    }

    _getZoomX () {
        return storage.getConfig().zoomX
    }

    _initSize (elm) {
        // 初始化属性
        const elmWidth = Math.floor(elm.getBoundingClientRect().width)
        const elmHeight = Math.floor(elm.getBoundingClientRect().height)
        elm.style.width = elmWidth + 'px'
        elm.style.height = elmHeight + 'px'
        elm.width = elmWidth * dpr
        elm.height = elmHeight * dpr
    }

    subscribe (eventName, func) {
        if (!Object.values(enumEvents).includes(eventName)) {
            throw new Error('unable to add click event: ' + eventName)
        }

        this._observer.subscribe(eventName, func.bind(this))
    }

    unSubscribe(type) {
        this._observer.unSubscribe(type)
    }

    applyConfig (options) {
        storage.update({
            ...options
        })

        storage.update({
            zoomX: this._getZoomX()
        })
        this.updateChart()
    }

    updateChart () {
        storage.update({
            kList: formatData(storage.getConfig())
        })
        this._updateSize()
        this._instance.area.draw()
        this._instance.areaCross.draw()
        this._instance.xAxis.draw()
    }

    resetGlobal () {
        storage.init()
    }
}
