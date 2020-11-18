# time-sharing

canvas分时图


## Basic Usage

In a browser:

```html
<script src="time-sharing.min.js"></script>
```
```javascript
var myChart = new timeSharing.InitChart({
    el: '#my-chart',
})
```

Using npm:

```shell
npm i time-sharing --save
```
```javascript
import { InitChart } from 'time-sharing'

var myChart = new InitChart({
    el: '#my-chart'
})
```

## 效果图

## demo

<https://zakrivi.github.io/time-sharing/example/>


## `applyConfig`

```js
myChart.applyConfig(options);
```

传递图表数据和参数, 并重新绘制图表

### <a id="dir">`options`</a>
* type: `object`

|name|type|default| description|
|-----|---|--------|----|
| *rawData | array | [] | 分时数据 |
| *tradingLength | number | 60*24 | 交易时段的最大数据量 |
| *startTime | number | Date.now() - 60 * 60 * 24 * 1000 | 开始时间 |
| *endTime | number | Date.now() | 结束时间 |
| digit | number | 2 | 保留小数位 |
| colors | object | { up: 'red', down: 'green'} | 涨跌颜色 |

Example use:

```js
const rawData = [] // 例: [{time: 1604006220, price: '1.94914'},...]

myChart.applyConfig({
    rawData: rawData, 
    startTime: 1604008800000, 
    endTime: 1604091600000,
    closePrice: 1.95070,
    tradingLength: 60 * 24, 
    digit:5
});
```

## `subscribe`

```javascript
myChart.subscribe(type, callback)
```

订阅图表事件

### <a id="dir">`type`</a>
* type: `string`
* value: mousemove | mousedown | mouseup | mouseleave | touchend | touchstart | touchmove

Example use:

```js
myChart.subscribe('mousedown', function(){
    console.log('mousedown')
});
```