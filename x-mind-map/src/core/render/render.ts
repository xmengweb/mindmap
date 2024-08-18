import MindMap from '../../index'
import merge from 'deepmerge'
import LogicalStructure from '../../layouts/logicalStructure'
import TextEdit from './textEdit'
import { checkNodeListIsEqual, getNodeIndexInNodeList, walk } from '../../utils'

export default class Render {
  opt: any
  mindMap: MindMap
  reRender: boolean
  isRendering: boolean
  hasWaitRendering: boolean
  waitRenderingParams: [any, string]
  renderTree: any
  layout: LogicalStructure
  //  构造函数
  constructor(opt) {
    this.opt = opt
    this.mindMap = opt.mindMap

    this.renderTree = this.mindMap.opt.data ? merge({}, this.mindMap.opt.data) : null
    // 是否重新渲染
    this.reRender = false
    // 是否正在渲染中
    this.isRendering = false
    // 当前激活的节点列表
    this.activeNodeList = []
    // 根节点
    this.root = null
    // 文本编辑框
    this.textEdit = new TextEdit(this)

    // 当前复制的数据
    this.lastBeingCopyData = null
    this.beingCopyData = null
    this.beingPasteText = ''
    this.beingPasteImgSize = 0
    this.currentBeingPasteType = ''
    // 节点高亮框
    this.highlightBoxNode = null
    // 上一次节点激活数据
    this.lastActiveNode = null
    this.lastActiveNodeList = []

    //布局
    this.layout = new LogicalStructure(this)
    // 绑定事件
    this.bindEvent()
    // 注册命令
    this.registerCommands()
  }
  render(callback = () => {}, source) {
    // 如果当前还没有渲染完毕，不再触发渲染
    if (this.isRendering) {
      // 等待当前渲染完毕后再进行一次渲染
      this.hasWaitRendering = true
      this.waitRenderingParams = [callback, source]
      return
    }
    this.isRendering = true
    // 触发当前重新渲染的来源
    this.renderSource = source
    // 重新渲染需要清除激活状态
    if (this.reRender) {
      this.clearActiveNodeList()
    }
    // 如果没有节点数据
    if (!this.renderTree) {
      this.isRendering = false
      this.mindMap.event.emit('node_tree_render_end')
      return
    }
    this.mindMap.event.emit('node_tree_render_start')
    // 计算布局
    this.root = null
    this.layout.doLayout((root) => {
      // 更新根节点
      this.root = root
      console.log(123, this.root)

      // 渲染节点
      this.root.render(() => {
        this.isRendering = false
        callback && callback()
        if (this.hasWaitRendering) {
          const params = this.waitRenderingParams
          this.hasWaitRendering = false
          this.waitRenderingParams = []
          this.render(...params)
        } else {
          this.renderSource = ''
          if (this.reRender) {
            this.reRender = false
          }
        }
        this.mindMap.event.emit('node_tree_render_end')
      })
    })
    this.emitNodeActiveEvent()
  }
  //绑定事件
  bindEvent() {
    // 画布点击事件清除当前激活节点列表
    this.mindMap.event.on('draw_click', (e) => {
      this.clearActiveNodeListOnDrawClick(e, 'click')
    })
    // 画布右键事件事件清除当前激活节点列表
    this.mindMap.event.on('contextmenu', (e) => {
      this.clearActiveNodeListOnDrawClick(e, 'contextmenu')
    })
    // 鼠标双击回到根节点
    this.mindMap.svg.on('dblclick', () => {
      if (!this.mindMap.opt.enableDblclickBackToRootNode) return
      this.setRootNodeCenter()
    })
  }
  //  注册命令
  registerCommands() {
    // 全选
    this.selectAll = this.selectAll.bind(this)
    this.mindMap.command.add('SELECT_ALL', this.selectAll)
  }
  // 鼠标点击画布时清空当前激活节点列表
  clearActiveNodeListOnDrawClick(e, eventType) {
    if (this.activeNodeList.length <= 0) return
    // 清除激活状态
    let isTrueClick = true
    // 是否是左键多选节点，右键拖动画布
    const { useLeftKeySelectionRightKeyDrag } = this.mindMap.opt
    // 如果鼠标按下和松开的距离较大，则不认为是点击事件
    if (eventType === 'contextmenu' ? !useLeftKeySelectionRightKeyDrag : useLeftKeySelectionRightKeyDrag) {
      const mousedownPos = this.mindMap.event.mousedownPos
      isTrueClick = Math.abs(e.clientX - mousedownPos.x) <= 5 && Math.abs(e.clientY - mousedownPos.y) <= 5
    }
    if (isTrueClick) {
      this.mindMap.command.exec('CLEAR_ACTIVE_NODE')
    }
  }
  //  清除当前激活的节点列表
  clearActiveNodeList() {
    this.activeNodeList.forEach((item) => {
      this.mindMap.command.exec('SET_NODE_ACTIVE', item, false)
    })
    this.activeNodeList = []
  }
  // 添加节点到激活列表里
  addNodeToActiveList(node, notEmitBeforeNodeActiveEvent = false) {
    if (this.mindMap.opt.onlyOneEnableActiveNodeOnCooperate && node.userList.length > 0) return
    const index = this.findActiveNodeIndex(node)
    if (index === -1) {
      if (!notEmitBeforeNodeActiveEvent) {
        this.mindMap.event.emit('before_node_active', node, this.activeNodeList)
      }
      this.mindMap.command.exec('SET_NODE_ACTIVE', node, true)
      this.activeNodeList.push(node)
    }
  }
  //  全选
  selectAll() {
    if (this.mindMap.opt.readonly) return
    walk(
      this.root,
      null,
      (node) => {
        if (!node.getData('isActive')) {
          this.addNodeToActiveList(node)
        }
        // 概要节点
        if (node._generalizationList && node._generalizationList.length > 0) {
          node._generalizationList.forEach((item) => {
            const gNode = item.generalizationNode
            if (!gNode.getData('isActive')) {
              this.addNodeToActiveList(gNode)
            }
          })
        }
      },
      null,
      true,
      0,
      0
    )
    this.emitNodeActiveEvent()
  }
  // 派发节点激活事件
  emitNodeActiveEvent(node = null, activeNodeList = [...this.activeNodeList]) {
    let isChange = false
    isChange = this.lastActiveNode !== node
    if (!isChange) {
      isChange = !checkNodeListIsEqual(this.lastActiveNodeList, activeNodeList)
    }
    if (!isChange) return
    this.lastActiveNode = node
    this.lastActiveNodeList = [...activeNodeList]
    this.mindMap.event.emit('node_active', node, activeNodeList)
  }

  //  检索某个节点在激活列表里的索引
  findActiveNodeIndex(node) {
    return getNodeIndexInNodeList(node, this.activeNodeList)
  }
}
