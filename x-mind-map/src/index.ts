import { SVG } from '@svgdotjs/svg.js'
import merge from 'deepmerge'
import Event from './core/event/event'
import defaultTheme from './theme/default'
import type { G, Svg as ISvg } from '@svgdotjs/svg.js'
import { IMindMapOptions } from './type'
import Command from './core/command/command'
import Render from './core/render/render'
import { cssContent } from './constants'
import Style from './core/render/node/Style'

class MindMap {
  el: HTMLDivElement
  opt: IMindMapOptions
  svg: ISvg
  draw: G
  lineDraw: G
  nodeDraw: G
  cssEl: HTMLStyleElement
  width: number
  initWidth: number
  height: number
  initHeight: number
  themeConfig: any

  event: Event
  command: Command
  renderer: Render

  constructor(options: IMindMapOptions) {
    this.opt = options
    this.el = options.el

    const { width, height } = this.getElRectInfo()
    this.width = width
    this.height = height
    // 画布初始大小
    this.initWidth = this.width
    this.initHeight = this.height

    // 添加css
    this.cssEl = null
    this.addCss()

    this.initContainer()

    this.initTheme()

    this.event = new Event({
      mindMap: this,
    })

    this.command = new Command({
      mindMap: this,
    })

    this.renderer = new Render({
      mindMap: this,
    })

    this.render(() => {})
  }
  //  设置主题
  initTheme() {
    // 合并主题配置
    this.themeConfig = merge(defaultTheme, this.opt.themeConfig || {})
    // 设置背景样式
    Style.setBackgroundStyle(this.el, this.themeConfig)
  }

  // 创建容器元素
  initContainer() {
    // 给容器元素添加一个类名
    this.el.classList.add('smm-mind-map-container')
    // 画布
    this.svg = SVG().addTo(this.el).size(this.width, this.height)

    // 容器
    this.draw = this.svg.group()
    this.draw.addClass('smm-container')
    // 节点连线容器
    this.lineDraw = this.draw.group()
    this.lineDraw.addClass('smm-line-container')

    // 节点容器
    this.nodeDraw = this.draw.group()
    this.nodeDraw.addClass('smm-node-container')
  }

  // 获取或更新容器尺寸位置信息
  getElRectInfo() {
    this.elRect = this.el.getBoundingClientRect()
    console.log(' this.elRect', this.elRect)

    if (this.width <= 0 || this.height <= 0) throw new Error('容器元素el的宽高不能为0')
    return { width: this.elRect.width, height: this.elRect.height }
  }

  // 清空各容器
  clearDraw() {
    this.lineDraw.clear()
    this.nodeDraw.clear()
  }
  // 添加必要的css样式到页面
  addCss() {
    this.cssEl = document.createElement('style')
    this.cssEl.type = 'text/css'
    this.cssEl.innerHTML = cssContent
    document.head.appendChild(this.cssEl)
  }

  // 移除css
  removeCss() {
    document.head.removeChild(this.cssEl)
  }

  render(callback, source = '') {
    this.renderer.render(callback, source)
  }
}

export default MindMap
