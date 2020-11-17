const isPC = !/ipad|iphone|midp|rv:1.2.3.4|ucweb|android|windows ce|windows mobile/.test(navigator.userAgent.toLowerCase());
const dpr = window.devicePixelRatio;

// 获取事件名称
const enumEvents = (() => {
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
})();

// 获取最高价
function getHighPrice ({ rawData }) {
    return Math.max(...rawData.map(item => item.price))
}
// 获取最低价
function getLowPrice ({ rawData }) {
    return Math.min(...rawData.map(item => item.price))
}

// 获取最高值
function getHighestValue ({ closePrice, computedHighPrice, computedLowPrice }) {
    // (取 |最高价-开盘价|、|最低价-开盘价| 对应绝对值中的最高值)
    const highestValue = Math.max(Math.abs(computedHighPrice - closePrice), Math.abs(computedLowPrice - closePrice));

    return highestValue * 1.15
}

// 获取图表高度差值
function getChartHeightDiff ({ closePrice, computedHighPrice, computedLowPrice }) {
    const { upperPoint, bottomPoint } = getCriticalValue({ closePrice, computedHighPrice, computedLowPrice });
    return upperPoint - bottomPoint
}

// 获取上下坐标点
function getCriticalValue ({ closePrice, computedHighPrice, computedLowPrice }) {
    const highestValue = getHighestValue({ closePrice, computedHighPrice, computedLowPrice });
    // 上轴坐标点
    const upperPoint = closePrice + highestValue;
    // 下轴坐标点
    const bottomPoint = closePrice - highestValue;

    return {
        upperPoint,
        bottomPoint
    }
}

// 格式化数据
function formatData (options) {
    const { rawData, zoomX, closePrice, computedHighPrice, computedLowPrice, size, tradingLength, debug } = options;
    const scale = tradingLength <= size.containerWidth ? 1 : tradingLength / (size.containerWidth + 1);
    let result = [];

    if (!rawData.length) {
        return []
    }
    const shownKlist = [];
    let index = 0;
    let hasLast = false;
    const interval = Math.floor(scale);
    const remainder = scale % interval;
    let sum = 0;
    while (index < rawData.length) {
        shownKlist.push(rawData[index]);
        if (index === rawData.length - 1) {
            hasLast = true;
        }

        index = index + interval;
        sum += remainder;

        if (sum >= 1) {
            index += Math.floor(sum);
            sum = sum - Math.floor(sum);
        }
    }

    if (!hasLast) {
        shownKlist.push(rawData[rawData.length - 1]);
    }

    result = shownKlist.map((item, i) => {
        return {
            ...item,
            x: priceToXAxis(i, zoomX),
            y: priceToYAxis(item.price, { closePrice, computedHighPrice, computedLowPrice, size })
        }
    });

    if (debug && result.length) {
        const times = result.map(item => {
            const date = new Date(item.time * 1000);
            const M = date.getMonth() + 1;
            const D = date.getDate();
            const h = date.getHours();
            const m = date.getMinutes();
            const timeStr = `${M}/${D} ${h}:${m}`;
            return [timeStr, item.time, item.price]
        });
        console.log({ times });
    }
    return result
}

// 价格转换y轴坐标
function priceToYAxis (price, { closePrice, computedHighPrice, computedLowPrice, size }) {
    var heightDiff = getChartHeightDiff({ closePrice, computedHighPrice, computedLowPrice });
    const result = Math.round((1 - (price - closePrice + heightDiff / 2) / heightDiff) * size.areaCtxHeight);
    return result
}

// 任意y坐标计算对应的价格
function yAxisToPrice (y, { closePrice, computedHighPrice, computedLowPrice, size }) {
    var heightDiff = getChartHeightDiff({ closePrice, computedHighPrice, computedLowPrice });

    return (1 - y / size.areaCtxHeight) * heightDiff - heightDiff / 2 + closePrice
}

// 价格转换x轴坐标
function priceToXAxis (index, zoomX) {
    const result = index * zoomX;
    return result
}

// 获取x坐标对应的数据
function getCorssData ({ x, zoomX }, kList) {
    const index = Math.round(x / zoomX);
    return kList[index] ? kList[index] : null
}

// 获取焦点坐标
const getCoordinate = (() => {
    if (isPC) {
        return function (e) { return { x: e.offsetX * dpr, y: e.offsetY * dpr } }
    } else {
        return function (e, size) {
            const x = (e.targetTouches[0].pageX - size.areaRect.left) * dpr;
            const y = (e.targetTouches[0].pageY - size.areaRect.top) * dpr;
            return { x, y }
        }
    }
})();

function priceDigit (val, digit = 2) {
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
function toFixed (num, s = 2) {
    const times = Math.pow(10, s);
    let des = 0;
    if (num > 0) {
        des = num * times + 0.5;
    } else {
        des = num * times - 0.5;
    }
    des = parseInt(des, 10) / times;
    return Number(des).toFixed(s)
}

class Observer {
    constructor() {
        this._subscribers = {};
    }

    subscribe(type, func) {
        !this._subscribers[type] && (this._subscribers[type] = []);
        this._subscribers[type].push(func);
    }

    unSubscribe(type) {
        delete this._subscribers[type];
    }

    publish(type, data) {
        if (Array.isArray(this._subscribers[type])) {
            this._subscribers[type].forEach(cb => cb(data));
        }
    }
}

// 配置类
class Storage {
    constructor() {
        if (!Storage._instance) {
            this.init();
            Storage._instance = this;
        }

        return Storage._instance
    }

    // 初始化参数
    init() {
        this._config = getDefaultConfig();
    }

    // 更新参数
    update(options) {
        Object.keys(options).forEach(key => {
            this._config[key] = options[key];
        });

        const { highPrice, lowPrice, rawData } = this._config;
        this._config.computedHighPrice = highPrice || getHighPrice({ rawData });
        this._config.computedLowPrice = lowPrice || getLowPrice({ rawData });
    }

    getConfig() {
        return this._config
    }
}

function getDefaultConfig () {
    return {
        zoomX: dpr,
        rawData: [],
        kList: [],
        highPrice: null,
        lowPrice: null,
        closePrice: null,
        computedHighPrice: null,
        computedLowPrice: null,
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
            up: 'red',
            down: 'green'
        },
        nodes: {}
    }
}

const storage = new Storage();

// 面积图
class InitArea {
    constructor (options) {
        this._init(options);
        // this.draw()
    }

    _init (options) {
        this._canvas = storage.getConfig().nodes.area;
        this._canvas.style.cssText = 'position: absolute;top: 0;left: 0;width: 100%;height: 100%;';

        this._options = options;
        this.ctx = this._canvas.getContext('2d');
    }

    draw () {
        if (storage.getConfig().kList.length === 0) {
            return
        }

        const { ctx } = this;

        ctx.clearRect(0, 0, storage.getConfig().size.areaCtxWidth, storage.getConfig().size.areaCtxHeight);

        // 绘制背景色
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, storage.getConfig().size.areaCtxWidth, storage.getConfig().size.areaCtxHeight);

        ctx.save();

        // 绘制曲线
        ctx.beginPath();
        ctx.lineWidth = 1 * dpr;
        storage.getConfig().kList.forEach((item, i) => {
            ctx.lineTo(item.x, item.y);
        });
        ctx.strokeStyle = 'rgb(71, 127, 211)';
        ctx.stroke();

        ctx.lineTo(storage.getConfig().kList[storage.getConfig().kList.length - 1].x, storage.getConfig().size.areaCtxHeight);
        // 路径闭合
        storage.getConfig().kList.length && ctx.lineTo(storage.getConfig().kList[0].x, storage.getConfig().size.areaCtxHeight);

        // 渐变色
        const gradient = ctx.createLinearGradient(0, 0, 0, storage.getConfig().size.areaCtxHeight);
        gradient.addColorStop(0, 'rgba(61,114,228,0.5)');
        gradient.addColorStop(1, 'rgba(61,114,228,0.01)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        this._drawOpenLine();
        this._drawPoint();
    }

    // 中轴线(当天开盘价)
    _drawOpenLine () {
        const { ctx } = this;
        const y = Math.round(storage.getConfig().size.areaCtxHeight / 2);
        ctx.save();
        ctx.beginPath();
        ctx.translate(0.5, 0.5);
        ctx.lineWidth = 1 * dpr;
        ctx.moveTo(0, y);
        ctx.lineTo(storage.getConfig().size.areaCtxWidth, y);
        ctx.setLineDash([4 * dpr, 4 * dpr]); // [实线长度, 间隙长度]
        ctx.lineDashOffset = 0;
        ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
        ctx.stroke();

        ctx.font = storage.getConfig().font.normal;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#666';
        ctx.fillText(priceDigit(storage.getConfig().closePrice, storage.getConfig().digit), 12 * dpr, storage.getConfig().size.areaCtxHeight / 2 - 5 * dpr);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#aaa';
        ctx.fillText(priceDigit(0, 2) + '%', storage.getConfig().size.areaCtxWidth - 12 * dpr, storage.getConfig().size.areaCtxHeight / 2 - 5 * dpr);

        ctx.restore();
    }

    // 上下坐标点、涨跌幅
    _drawPoint () {
        const { ctx } = this;
        const { closePrice, size, digit, colors, computedHighPrice, computedLowPrice } = storage.getConfig();
        const { upperPoint, bottomPoint } = getCriticalValue({ closePrice, computedHighPrice, computedLowPrice });
        const upperChange = (upperPoint - closePrice) / closePrice * 100;
        const bottomChange = (bottomPoint - closePrice) / closePrice * 100;

        ctx.save();
        ctx.font = storage.getConfig().font.normal;

        ctx.fillStyle = colors.up;
        ctx.textAlign = 'left';
        ctx.fillText(priceDigit(upperPoint, digit), 12 * dpr, 16 * dpr);
        ctx.textAlign = 'right';
        ctx.fillText(priceDigit(upperChange, 2) + '%', size.areaCtxWidth - 12 * dpr, 16 * dpr);

        ctx.fillStyle = colors.down;
        ctx.textAlign = 'left';
        ctx.fillText(priceDigit(bottomPoint, digit), 12 * dpr, size.areaCtxHeight - 6 * dpr);
        ctx.textAlign = 'right';
        ctx.fillText(priceDigit(bottomChange, 2) + '%', size.areaCtxWidth - 12 * dpr, size.areaCtxHeight - 6 * dpr);

        ctx.restore();
    }
}

// 面积交互
class InitCorss {
    constructor (options) {
        this._canvas = storage.getConfig().nodes.areaCross;
        this._canvas.style.cssText = 'position: absolute;top: 0;left: 0;width: 100%;height: 100%;';
        this.ctx = this._canvas.getContext('2d');

        this._options = options;

        this._crossE = null;
        this.isShowCross = false;
        this._drawRound();
    }

    draw (e) {
        e && (this._crossE = e);
        this.ctx.clearRect(0, 0, storage.getConfig().size.areaCrossCtxWidth, storage.getConfig().size.areaCrossCtxHeight);
        this.isShowCross && (e || this._crossE) && this._drawCrossLine(e);
    }

    // 绘画十字线
    _drawCrossLine (e) {
        const { ctx } = this;
        const { digit, closePrice, size, font, computedHighPrice, computedLowPrice } = storage.getConfig();
        const coordinate = getCoordinate(e || this._crossE, size);
        const x = Math.round(coordinate.x);
        const y = Math.round(coordinate.y);

        ctx.save();
        ctx.beginPath();
        ctx.translate(0.5 / dpr, 0.5 / dpr);
        ctx.setLineDash([5 * dpr, 8 * dpr]); // [实线长度, 间隙长度]
        ctx.lineDashOffset = 0;
        ctx.lineWidth = 1 * dpr;
        ctx.strokeStyle = '#000';
        ctx.moveTo(0, y);
        ctx.lineTo(size.areaCrossCtxWidth, y);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, storage.getConfig().size.areaCrossCtxHeight);
        ctx.stroke();
        ctx.restore();

        const price = priceDigit(yAxisToPrice(y, { closePrice, computedHighPrice, computedLowPrice, size }), digit);
        const priceChange = priceDigit((price - closePrice) / closePrice * 100, 2) + '%';
        ctx.save();
        ctx.beginPath();
        ctx.font = font.normal;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#333';
        ctx.fillText(price, 12 * dpr, y - 4 * dpr);

        ctx.beginPath();
        ctx.font = font.normal;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#333';
        ctx.fillText(priceChange, size.areaCrossCtxWidth - 12 * dpr, y - 5 * dpr);
        ctx.restore();
        this._drawColumnPrice(e);
    }

    // 对应列的价格显示
    _drawColumnPrice (e) {
        const { ctx } = this;
        const { size, kList, closePrice, zoomX } = storage.getConfig();
        const coordinate = getCoordinate(e || this._crossE, size);
        const x = coordinate.x;
        const target = getCorssData({ x, zoomX }, kList);
        if (!target) {
            return
        }

        const { price } = target;
        const y = target.y;

        ctx.save();
        ctx.translate(0.5, 0.5);
        ctx.beginPath();
        ctx.lineWidth = 1 * dpr;
        ctx.arc(x, y, 3 * dpr, 0, Math.PI * 2, false);
        ctx.fillStyle = '#f6822f';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size.areaCrossCtxWidth, y);
        ctx.setLineDash([5 * dpr, 5 * dpr]); // [实线长度, 间隙长度]
        ctx.lineDashOffset = 0;
        ctx.strokeStyle = '#f6822f';
        ctx.stroke();

        ctx.font = storage.getConfig().font.normal;
        ctx.fillStyle = '#f6822f';
        ctx.textAlign = 'center';
        ctx.fillText(price, 30 * dpr, y - 5 * dpr);

        const priceChange = (price - closePrice) / closePrice * 100;
        ctx.textAlign = 'right';
        ctx.fillText(priceDigit(priceChange, 2) + '%', size.areaCrossCtxWidth - 12 * dpr, y - 5 * dpr);

        ctx.restore();
    }

    _drawRound () {
        const { ctx } = this;
        let zoom = 2;
        let direction = 1;
        drawRound.call(this, zoom);

        function drawRound () {
            const leng = storage.getConfig().kList.length;
            if (leng) {
                const { x, y, time: lastTime } = storage.getConfig().kList[leng - 1];
                const { endTime } = storage.getConfig();
                if (lastTime >= Math.floor(endTime / 1000 - endTime / 1000 % 60)) {
                    // 休市停止闪烁
                    return
                }

                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = 'rgba(71, 127, 211, 1)';
                ctx.arc(x, y, 2 * dpr, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.fillStyle = 'rgba(71, 127, 211, 0.28)';
                ctx.arc(x, y, zoom * dpr, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.restore();

                if (zoom > 9) {
                    zoom = 9;
                    direction *= -1;
                } else if (zoom < 2) {
                    zoom = 2;
                    direction *= -1;
                }

                zoom += direction * zoom / 40;
            }

            requestAnimationFrame(() => {
                this.draw();
                drawRound.call(this, zoom);
            });
        }
    }
}

// 横坐标图
class InitXAxis {
    constructor (options) {
        this._canvas = storage.getConfig().nodes.xAxis;
        this._canvas.style.cssText = 'position: absolute;top: 0;left: 0;width: 100%;height: 100%;';

        this.ctx = this._canvas.getContext('2d');

        this._options = options;
        this._crossE = 0;
        this.isShowCross = false;
        this.draw();
    }

    draw (e) {
        const { ctx } = this;
        ctx.clearRect(0, 0, storage.getConfig().size.areaCtxWidth, this._canvas.height);

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, storage.getConfig().size.areaCtxWidth, storage.getConfig().size.areaCtxHeight);

        // 渲染横坐标
        if (storage.getConfig().startTime) {
            this._drawPoint({
                x: 0,
                time: storage.getConfig().startTime,
                textAlign: 'left',
                offsetX: 2
            });
        }
        if (storage.getConfig().endTime) {
            this._drawPoint({
                x: this._canvas.width - 1,
                time: storage.getConfig().endTime,
                textAlign: 'right',
                offsetX: -2
            });
        }
        ctx.restore();

        e && (this._crossE = e);
        this.isShowCross && (e || this._crossE) && this._drawCrossValue(e);
    }

    // 绘画单个坐标点
    _drawPoint (options) {
        const { ctx } = this;
        const { textAlign = 'center', x, time, offsetX } = options;
        ctx.save();
        ctx.beginPath();
        ctx.translate(0.5, 0.5);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 4 * dpr);
        ctx.strokeStyle = '#505361';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();

        // 时间显示
        const M = ('0' + (new Date(time).getMonth() + 1)).substr(-2);
        const d = ('0' + new Date(time).getDate()).substr(-2);
        const h = ('0' + new Date(time).getHours()).substr(-2);
        const m = ('0' + new Date(time).getMinutes()).substr(-2);
        ctx.font = storage.getConfig().font.normal;
        ctx.fillStyle = '#505361';
        ctx.textAlign = textAlign;
        ctx.fillText(`${M}/${d} ${h}:${m}`, x + offsetX * dpr, 20 * dpr);
        ctx.restore();
    }

    // 绘画十字光标对应的x值
    _drawCrossValue (e) {
        const { size, kList, zoomX } = storage.getConfig();
        const coordinate = getCoordinate(e || this._crossE, size);
        const x = Math.round(coordinate.x);

        const { ctx } = this;
        const target = getCorssData({ x, zoomX }, kList);
        if (!target) {
            return
        }
        const { time } = target;
        const positionX = Math.floor(x - 40 * dpr);
        const rectWidth = 80 * dpr;
        const rectMinX = 0;
        const rectMaxX = size.areaCtxWidth - rectWidth;
        const rectX = Math.floor(positionX >= 0 ? (positionX <= rectMaxX ? positionX : rectMaxX) : rectMinX);
        const textX = rectX + 8 * dpr;
        ctx.save();
        // 矩形框
        ctx.fillStyle = 'rgb(76,82,94)';
        ctx.fillRect(rectX, 0, rectWidth, 15 * dpr);
        // 文字
        const M = ('0' + (new Date(time * 1000).getMonth() + 1)).substr(-2);
        const d = ('0' + new Date(time * 1000).getDate()).substr(-2);
        const h = ('0' + new Date(time * 1000).getHours()).substr(-2);
        const m = ('0' + new Date(time * 1000).getMinutes()).substr(-2);
        ctx.font = storage.getConfig().font.normal;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`${M}/${d} ${h}:${m}`, textX, 11 * dpr);
        ctx.restore();
    }
}

class InitChart {
    constructor (args) {
        // 更新配置
        storage.update({
            nodes: {
                container: document.createElement('div'),
                area: document.createElement('canvas'),
                areaCross: document.createElement('canvas'),
                xAxis: document.createElement('canvas')
            }
        });

        // 初始化
        this._init();
        this._initDOM(args.el);
        this.updateChart();
    }

    _init () {
        this._instance = {
            // 面积图
            area: new InitArea(),
            // 面积图交互层
            areaCross: new InitCorss(),
            // 横坐标图
            xAxis: new InitXAxis()
        };

        this._observer = new Observer();

        // 绑定事件(面积图交互层#area-cross)
        this._bindEventForAreaCross();

        // window.addEventListener('resize', this.updateChart.bind(this))
    }

    // 渲染DOM节点
    _initDOM (elmId) {
        const { nodes } = storage.getConfig();

        nodes.container.id = 'wrap';
        nodes.container.style.cssText = 'position: relative;width: 100%;height: 100%;display:flex;flex-direction:column;';

        const areaParentElm = document.createElement('div');
        areaParentElm.id = 'areaParentElm';
        areaParentElm.style.cssText = 'position: relative;width: 100%;user-select: none;flex: 1;cursor: crosshair;';
        areaParentElm.appendChild(nodes.area);
        areaParentElm.appendChild(nodes.areaCross);

        const xAxisParentElm = document.createElement('div');
        xAxisParentElm.id = 'xAxisParentElm';
        xAxisParentElm.style.cssText = 'width: 100%;user-select: none;position: relative;flex:0 0 28px;height: 28px;border-top: 1px solid #505361;box-sizing: border-box;overflow: hidden;';
        xAxisParentElm.appendChild(nodes.xAxis);

        nodes.container.appendChild(areaParentElm);
        nodes.container.appendChild(xAxisParentElm);

        // 渲染到页面
        document.querySelector(elmId).appendChild(nodes.container);
    }

    _bindEventForAreaCross () {
        const areaCross = storage.getConfig().nodes.areaCross;

        /* mousedown/touchstart */
        areaCross.addEventListener(enumEvents.start, e => {
            e.preventDefault();
            e.stopPropagation();

            this._observer.publish(enumEvents.start);
        });
        /* mousedown/touchstart */

        /* mousemove/touchmove */
        // 左右平移
        areaCross.addEventListener(enumEvents.move, e => {
            e.preventDefault();
            e.stopPropagation();

            this._instance.areaCross.isShowCross = true;
            this._instance.xAxis.isShowCross = true;

            this._handleHorizontalScroll(e);

            const { zoomX, kList } = storage.getConfig();
            const target = getCorssData({ x: getCoordinate(e, storage.getConfig().size).x, zoomX }, kList);
            this._observer.publish(enumEvents.move, target || null);
        });
        /* mousemove/touchmove */

        /* mouseup */
        areaCross.addEventListener(enumEvents.end, e => {
            this._instance.areaCross.isShowCross = false;
            this._instance.xAxis.isShowCross = false;

            this._observer.publish(enumEvents.end);

            this.updateChart();
        });
        /* mouseup */

        /* mouseleave */
        if (enumEvents.leave) {
            areaCross.addEventListener(enumEvents.leave, e => {
                this._instance.areaCross.isShowCross = false;
                this._instance.xAxis.isShowCross = false;
                this._handleMouseLeave();
                this._observer.publish(enumEvents.leave);
                this.updateChart();
            });
        }
        /* mouseleave */
    }

    // 鼠标离开
    _handleMouseLeave () {
        this._instance.areaCross.draw();
        this._instance.xAxis.draw();
    }

    // 水平拖动
    _handleHorizontalScroll (e) {
        this._instance.areaCross.draw(e);
        this._instance.xAxis.draw(e);
    }

    _updateSize () {
        const { container, area, areaCross, xAxis } = storage.getConfig().nodes;
        const containerRect = container.getBoundingClientRect();
        const areaRect = area.getBoundingClientRect();
        const areaCrossRect = areaCross.getBoundingClientRect();
        const xAxisRect = xAxis.getBoundingClientRect();
[area, areaCross, xAxis].forEach(node => this._initSize(node));

        const size = {
            areaRect,
            containerWidth: Math.floor(containerRect.width),
            areaCtxWidth: Math.floor(areaRect.width * dpr),
            areaCtxHeight: Math.floor(areaRect.height * dpr),

            areaCrossCtxWidth: Math.floor(areaCrossRect.width * dpr),
            areaCrossCtxHeight: Math.floor(areaCrossRect.height * dpr),

            xAxisCtxWidth: Math.floor(xAxisRect.width * dpr),
            xAxisCtxHeight: Math.floor(xAxisRect.height * dpr)
        };

        // 初始化配置
        storage.update({
            size,
            zoomX: this._getZoomX()
        });

        storage.update({
            kList: formatData(storage.getConfig())
        });
    }

    _getZoomX () {
        return storage.getConfig().zoomX
    }

    _initSize (elm) {
        // 初始化属性
        const elmWidth = Math.floor(elm.getBoundingClientRect().width);
        const elmHeight = Math.floor(elm.getBoundingClientRect().height);
        elm.style.width = elmWidth + 'px';
        elm.style.height = elmHeight + 'px';
        elm.width = elmWidth * dpr;
        elm.height = elmHeight * dpr;
    }

    subscribe (eventName, func) {
        if (!Object.values(enumEvents).includes(eventName)) {
            throw new Error('unable to add click event: ' + eventName)
        }

        this._observer.subscribe(eventName, func.bind(this));
    }

    unSubscribe(type) {
        this._observer.unSubscribe(type);
    }

    applyConfig (options) {
        storage.update({
            ...options
        });

        storage.update({
            zoomX: this._getZoomX()
        });
        this.updateChart();
    }

    updateChart () {
        storage.update({
            kList: formatData(storage.getConfig())
        });
        this._updateSize();
        this._instance.area.draw();
        this._instance.areaCross.draw();
        this._instance.xAxis.draw();
    }

    resetGlobal () {
        storage.init();
    }
}

export { InitChart };
