import { G, Rect } from '@svgdotjs/svg.js'
import MindMap from '../../../index'
import Render from '../render'
import Style from './Style'
import Shape from './shape'
import nodeCommandWrapsMethods from './nodeCommandWraps'
import nodeCreateContentsMethods from './nodeCreateContents'

export interface INodeOpt {
  mindMap: MindMap
  renderer: Render
  nodeData: any
  uid: string
  data: any
}

class Node {
  opt: INodeOpt
  nodeData: any
  mindMap: MindMap
  uid: string
  renderer: Render
  draw: G
  nodeDraw: G
  lineDraw: G
  style: Style

  constructor(opt: INodeOpt) {
    this.opt = opt
    // 节点数据
    this.nodeData = opt.data
    // uid
    this.uid = opt.uid
    // 控制实例
    this.mindMap = opt.mindMap
    // 渲染实例
    this.renderer = opt.renderer
    // 渲染器
    this.draw = this.mindMap.draw
    this.nodeDraw = this.mindMap.nodeDraw
    this.lineDraw = this.mindMap.lineDraw
    // 样式实例
    this.style = new Style(this)
    this.shapeInstance = new Shape(this)
    this.shapePadding = {
      paddingX: 0,
      paddingY: 0,
    }
    // 是否是根节点
    this.isRoot = opt.isRoot === undefined ? false : opt.isRoot

    // 节点层级
    this.layerIndex = opt.layerIndex === undefined ? 0 : opt.layerIndex
    // 节点宽
    this.width = opt.width || 0
    // 节点高
    this.height = opt.height || 0
    // left
    this._left = opt.left || 0
    // top
    this._top = opt.top || 0
    // 自定义位置
    this.customLeft = opt.data.data.customLeft || undefined
    this.customTop = opt.data.data.customTop || undefined
    // 是否正在拖拽中
    this.isDrag = false
    // 父节点
    this.parent = opt.parent || null
    // 子节点
    this.children = opt.children || []
    // 当前同时操作该节点的用户列表
    this.userList = []
    // 节点内容的容器
    this.group = null
    this.shapeNode = null // 节点形状节点
    this.hoverNode = null // 节点hover和激活的节点
    // 节点内容对象
    this._customNodeContent = null
    this._imgData = null
    this._iconData = null
    this._textData = null
    this._hyperlinkData = null
    this._tagData = null
    this._noteData = null
    this.noteEl = null
    this.noteContentIsShow = false
    this._attachmentData = null
    this._numberData = null
    this._prefixData = null
    this._postfixData = null
    this._expandBtn = null
    this._lastExpandBtnType = null
    this._showExpandBtn = false
    this._openExpandNode = null
    this._closeExpandNode = null
    this._fillExpandNode = null
    this._userListGroup = null
    this._lines = []
    this._generalizationList = []
    this._unVisibleRectRegionNode = null
    this._isMouseenter = false
    // 尺寸信息
    this._rectInfo = {
      imgContentWidth: 0,
      imgContentHeight: 0,
      textContentWidth: 0,
      textContentHeight: 0,
    }
    // 概要节点的宽高
    this._generalizationNodeWidth = 0
    this._generalizationNodeHeight = 0
    // 编号字符
    this.number = opt.number || ''
    // 各种文字信息的间距
    this.textContentItemMargin = this.mindMap.opt.textContentMargin
    // 图片和文字节点的间距
    this.blockContentMargin = this.mindMap.opt.imgTextMargin
    // 展开收缩按钮尺寸
    this.expandBtnSize = this.mindMap.opt.expandBtnSize
    // 是否是多选节点
    this.isMultipleChoice = false
    // 是否需要重新layout
    this.needLayout = false
    // 当前是否是隐藏状态
    this.isHide = false

    const proto = Object.getPrototypeOf(this)
    if (!proto.bindEvent) {
      // 命令的相关方法
      Object.keys(nodeCommandWrapsMethods).forEach((item) => {
        proto[item] = nodeCommandWrapsMethods[item]
      })
      // 创建节点内容的相关方法
      Object.keys(nodeCreateContentsMethods).forEach((item) => {
        proto[item] = nodeCreateContentsMethods[item]
      })
      proto.bindEvent = true
    }
    // 初始化
    this.getSize()
  }

  //  获取某个样式
  getStyle(prop, root) {
    let v = this.style.merge(prop, root)
    return v === undefined ? '' : v
  }

  //  获取数据
  getData(key) {
    return key ? this.nodeData.data[key] : this.nodeData.data
  }

  //  计算节点的宽高
  getSize() {
    this.customLeft = this.getData('customLeft') || undefined
    this.customTop = this.getData('customTop') || undefined
    this.createNodeData()
    return true
  }

  //  创建节点的各个内容对象数据
  createNodeData() {
    // 自定义节点内容
    let { isUseCustomNodeContent, customCreateNodeContent, createNodePrefixContent, createNodePostfixContent } =
      this.mindMap.opt
    if (isUseCustomNodeContent && customCreateNodeContent) {
      this._customNodeContent = customCreateNodeContent(this)
    }
    // 如果没有返回内容，那么还是使用内置的节点内容
    if (this._customNodeContent) {
      addXmlns(this._customNodeContent)
      return
    }
    this._imgData = this.createImgNode()
    this._iconData = this.createIconNode()
    this._textData = this.createTextNode()
    this._hyperlinkData = this.createHyperlinkNode()
    this._tagData = this.createTagNode()
    this._noteData = this.createNoteNode()
    this._attachmentData = this.createAttachmentNode()
    if (this.mindMap.numbers) {
      this._numberData = this.mindMap.numbers.createNumberContent(this)
    }
    this._prefixData = createNodePrefixContent ? createNodePrefixContent(this) : null
    if (this._prefixData && this._prefixData.el) {
      addXmlns(this._prefixData.el)
    }
    this._postfixData = createNodePostfixContent ? createNodePostfixContent(this) : null
    if (this._postfixData && this._postfixData.el) {
      addXmlns(this._postfixData.el)
    }
  }
  //  连线
  renderLine(deep = false) {
    if (this.getData('expand') === false) {
      return
    }
    let childrenLen = this.nodeData.children.length
    if (childrenLen > this._lines.length) {
      // 创建缺少的线
      new Array(childrenLen - this._lines.length).fill(0).forEach(() => {
        this._lines.push(this.lineDraw.path())
      })
    } else if (childrenLen < this._lines.length) {
      // 删除多余的线
      this._lines.slice(childrenLen).forEach((line) => {
        line.remove()
      })
      this._lines = this._lines.slice(0, childrenLen)
    }
    // 画线
    this.renderer.layout.renderLine(
      this,
      this._lines,
      (...args) => {
        // 添加样式
        this.styleLine(...args)
      },
      this.style.getStyle('lineStyle', true)
    )
    // 子级的连线也需要更新
    if (deep && this.children && this.children.length > 0) {
      this.children.forEach((item) => {
        item.renderLine(deep)
      })
    }
  }
  //  设置连线样式
  styleLine(line, childNode, enableMarker) {
    const width = childNode.getSelfInhertStyle('lineWidth') || childNode.getStyle('lineWidth', true)
    const color = childNode.getSelfInhertStyle('lineColor') || childNode.getStyle('lineColor', true)
    const dasharray = childNode.getSelfInhertStyle('lineDasharray') || childNode.getStyle('lineDasharray', true)
    this.style.line(
      line,
      {
        width,
        color,
        dasharray,
      },
      enableMarker,
      childNode
    )
  }
  // 给节点绑定事件
  bindGroupEvent() {
    // 单击事件，选中节点
    this.group.on('click', (e) => {
      this.mindMap.event.emit('node_click', this, e)
      if (this.isMultipleChoice) {
        e.stopPropagation()
        this.isMultipleChoice = false
        return
      }
      if (this.mindMap.opt.onlyOneEnableActiveNodeOnCooperate && this.userList.length > 0) {
        return
      }
      this.active(e)
    })
    this.group.on('mousedown', (e) => {
      e.preventDefault()
      const { readonly, enableCtrlKeyNodeSelection, useLeftKeySelectionRightKeyDrag } = this.mindMap.opt
      // 只读模式不需要阻止冒泡
      if (!readonly) {
        if (this.isRoot) {
          // 根节点，右键拖拽画布模式下不需要阻止冒泡
          if (e.which === 3 && !useLeftKeySelectionRightKeyDrag) {
            e.stopPropagation()
          }
        } else {
          // 非根节点，且按下的是非鼠标中键，需要阻止事件冒泡
          if (e.which !== 2) {
            e.stopPropagation()
          }
        }
      }
      // 多选和取消多选
      if (!readonly && (e.ctrlKey || e.metaKey) && enableCtrlKeyNodeSelection) {
        this.isMultipleChoice = true
        let isActive = this.getData('isActive')
        if (!isActive) this.mindMap.emit('before_node_active', this, this.renderer.activeNodeList)
        this.mindMap.renderer[isActive ? 'removeNodeFromActiveList' : 'addNodeToActiveList'](this, true)
        this.renderer.emitNodeActiveEvent(isActive ? null : this)
      }
      this.mindMap.event.emit('node_mousedown', this, e)
    })
    this.group.on('mouseup', (e) => {
      if (!this.isRoot && e.which !== 2 && !this.mindMap.opt.readonly) {
        e.stopPropagation()
      }
      this.mindMap.event.emit('node_mouseup', this, e)
    })
    this.group.on('mouseenter', (e) => {
      if (this.isDrag) return
      this._isMouseenter = true
      this.mindMap.event.emit('node_mouseenter', this, e)
    })
    this.group.on('mouseleave', (e) => {
      if (!this._isMouseenter) return
      this._isMouseenter = false
      this.mindMap.event.emit('node_mouseleave', this, e)
    })
    // 双击事件
    this.group.on('dblclick', (e) => {
      const { readonly, onlyOneEnableActiveNodeOnCooperate } = this.mindMap.opt
      if (readonly || e.ctrlKey || e.metaKey) {
        return
      }
      e.stopPropagation()
      if (onlyOneEnableActiveNodeOnCooperate && this.userList.length > 0) {
        return
      }
      this.mindMap.event.emit('node_dblclick', this, e)
    })
    // 右键菜单事件
    this.group.on('contextmenu', (e) => {
      const { readonly, useLeftKeySelectionRightKeyDrag } = this.mindMap.opt
      // Mac上按住ctrl键点击鼠标左键不知为何触发的是contextmenu事件
      if (readonly || e.ctrlKey) {
        return
      }
      e.stopPropagation()
      e.preventDefault()
      // 如果是多选节点结束，那么不要触发右键菜单事件
      if (this.mindMap.select && !useLeftKeySelectionRightKeyDrag && this.mindMap.select.hasSelectRange()) {
        return
      }
      // 如果有且只有当前节点激活了，那么不需要重新激活
      if (!(this.getData('isActive') && this.renderer.activeNodeList.length === 1)) {
        this.renderer.clearActiveNodeList()
        this.active(e)
      }
      this.mindMap.event.emit('node_contextmenu', e, this)
    })
  }
  //  获取padding值
  getPaddingVale() {
    let { isActive } = this.getData()
    return {
      paddingX: this.getStyle('paddingX', true, isActive),
      paddingY: this.getStyle('paddingY', true, isActive),
    }
  }
  //  获取节点形状
  getShape() {
    // 节点使用功能横线风格的话不支持设置形状，直接使用默认的矩形
    return 'rectangle'
  }

  // 获取节点非节点状态的边框大小
  getBorderWidth() {
    return this.style.merge('borderWidth', false) || 0
  }
  //  定位节点内容
  layout() {
    if (!this.group) return
    // 清除之前的内容
    this.group.clear()
    const { hoverRectPadding, tagPosition } = this.mindMap.opt
    let { width, height, textContentItemMargin } = this
    let { paddingY } = this.getPaddingVale()
    const halfBorderWidth = this.getBorderWidth() / 2
    paddingY += this.shapePadding.paddingY + halfBorderWidth
    // 节点形状
    this.shapeNode = this.shapeInstance.createShape()
    this.shapeNode.addClass('smm-node-shape')
    this.shapeNode.translate(halfBorderWidth, halfBorderWidth)
    this.style.shape(this.shapeNode)
    this.group.add(this.shapeNode)

    // 概要节点添加一个带所属节点id的类名
    if (this.isGeneralization && this.generalizationBelongNode) {
      this.group.addClass('generalization_' + this.generalizationBelongNode.uid)
    }
    // 激活hover和激活边框
    const addHoverNode = () => {
      this.hoverNode = new Rect()
        .size(width + hoverRectPadding * 2, height + hoverRectPadding * 2)
        .x(-hoverRectPadding)
        .y(-hoverRectPadding)
      this.hoverNode.addClass('smm-hover-node')
      this.style.hoverNode(this.hoverNode, width, height)
      this.group.add(this.hoverNode)
    }

    const tagIsBottom = tagPosition === 'bottom'
    const { textContentHeight } = this._rectInfo
    // 图片节点
    let imgHeight = 0
    if (this._imgData) {
      imgHeight = this._imgData.height
      this.group.add(this._imgData.node)
      this._imgData.node.cx(width / 2).y(paddingY)
    }
    // 内容节点
    let textContentNested = new G()
    let textContentOffsetX = 0
    // 编号内容
    if (this._numberData) {
      this._numberData.node.x(textContentOffsetX).y((textContentHeight - this._numberData.height) / 2)
      textContentNested.add(this._numberData.node)
      textContentOffsetX += this._numberData.width + textContentItemMargin
    }
    // icon
    let iconNested = new G()
    if (this._iconData && this._iconData.length > 0) {
      let iconLeft = 0
      this._iconData.forEach((item) => {
        item.node.x(textContentOffsetX + iconLeft).y((textContentHeight - item.height) / 2)
        iconNested.add(item.node)
        iconLeft += item.width + textContentItemMargin
      })
      textContentNested.add(iconNested)
      textContentOffsetX += iconLeft
    }
    // 文字
    if (this._textData) {
      const oldX = this._textData.node.attr('data-offsetx') || 0
      this._textData.node.attr('data-offsetx', textContentOffsetX)
      // 修复safari浏览器节点存在图标时文字位置不正确的问题
      ;(this._textData.nodeContent || this._textData.node)
        .x(-oldX) // 修复非富文本模式下同时存在图标和换行的文本时，被收起和展开时图标与文字距离会逐渐拉大的问题
        .x(textContentOffsetX)
        .y((textContentHeight - this._textData.height) / 2)
      textContentNested.add(this._textData.node)
      textContentOffsetX += this._textData.width + textContentItemMargin
    }

    this.group.add(textContentNested)
    // 文字内容整体
    textContentNested.translate(
      width / 2 - textContentNested.bbox().width / 2,
      paddingY + // 内边距
        imgHeight + // 图片高度
        (imgHeight > 0 && textContentHeight > 0 ? this.blockContentMargin : 0) // 和图片的间距
    )
    addHoverNode()
    this.mindMap.event.emit('node_layout_end', this)
  }
  // 更新节点激活状态
  updateNodeActiveClass() {
    if (!this.group) return
    const isActive = this.getData('isActive')
    this.group[isActive ? 'addClass' : 'removeClass']('active')
  }
  //  更新节点
  update(forceRender) {
    if (!this.group) {
      return
    }
    this.updateNodeActiveClass()
    const { alwaysShowExpandBtn, notShowExpandBtn } = this.mindMap.opt
    // 不显示展开收起按钮则不需要处理
    if (!notShowExpandBtn) {
      const childrenLength = this.nodeData.children.length
    }

    // 更新节点位置
    let t = this.group.transform()
    // 如果节点位置没有变化，则返回
    if (this.left === t.translateX && this.top === t.translateY) return
    this.group.translate(this.left - t.translateX, this.top - t.translateY)
  }
  //  激活节点
  active(e) {
    if (this.mindMap.opt.readonly) {
      return
    }
    e && e.stopPropagation()
    if (this.getData('isActive')) {
      return
    }
    this.mindMap.event.emit('before_node_active', this, this.renderer.activeNodeList)
    this.renderer.clearActiveNodeList()
    this.renderer.addNodeToActiveList(this, true)
    this.renderer.emitNodeActiveEvent(this)
  }
  render(callback = () => {}, forceRender = false, async = false) {
    // 节点
    // 重新渲染连线
    this.renderLine()
    // 强制渲染、或没有开启性能模式、或不在画布可视区域内不渲染节点内容
    // 根节点不进行懒加载，始终渲染，因为滚动条插件依赖根节点进行计算
    if (true) {
      if (!this.group) {
        // 创建组
        this.group = new G()
        this.group.addClass('smm-node')
        this.group.css({
          cursor: 'default',
        })
        this.bindGroupEvent()
        this.nodeDraw.add(this.group)
        this.layout()
        this.update(forceRender)
      } else {
        if (!this.nodeDraw.has(this.group)) {
          this.nodeDraw.add(this.group)
        }
        if (this.needLayout) {
          this.needLayout = false
          this.layout()
        }
        this.update(forceRender)
      }
    }
    // 子节点
    if (this.children && this.children.length && this.getData('expand') !== false) {
      let index = 0
      this.children.forEach((item) => {
        const renderChild = () => {
          item.render(
            () => {
              index++
              if (index >= this.children.length) {
                callback()
              }
            },
            forceRender,
            async
          )
        }
        if (async) {
          setTimeout(renderChild, 0)
        } else {
          renderChild()
        }
      })
    } else {
      callback()
    }
    // 手动插入的节点立即获得焦点并且开启编辑模式
    if (this.nodeData.inserting) {
      delete this.nodeData.inserting
      this.active()
      // setTimeout(() => {
      this.mindMap.event.emit('node_dblclick', this, null, true)
      // }, 0)
    }
  }
}

export default Node
