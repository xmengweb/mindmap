import MindMap from '../../index'
import { copyRenderTree } from '../../utils'

//  命令类
class Command {
  opt: any
  mindMap: MindMap
  commands: any
  history: any
  activeHistoryIndex: number
  isPause: boolean
  //  构造函数
  constructor(opt) {
    this.opt = opt
    this.mindMap = opt.mindMap
    this.commands = {}
    this.history = []
    this.activeHistoryIndex = 0
    // 是否暂停收集历史数据
    this.isPause = false
  }

  // 暂停收集历史数据
  pause() {
    this.isPause = true
  }

  // 恢复收集历史数据
  recovery() {
    this.isPause = false
  }

  //  清空历史数据
  clearHistory() {
    this.history = []
    this.activeHistoryIndex = 0
    this.mindMap.event.emit('back_forward', 0, 0)
  }

  //  执行命令
  exec(name, ...args) {
    if (this.commands[name]) {
      this.commands[name].forEach((fn) => {
        fn(...args)
      })
      if (['BACK', 'FORWARD', 'SET_NODE_ACTIVE', 'CLEAR_ACTIVE_NODE'].includes(name)) {
        return
      }
    }
  }

  //  添加命令
  add(name, fn) {
    if (this.commands[name]) {
      this.commands[name].push(fn)
    } else {
      this.commands[name] = [fn]
    }
  }

  //  移除命令
  remove(name, fn) {
    if (!this.commands[name]) {
      return
    }
    if (!fn) {
      this.commands[name] = []
      delete this.commands[name]
    } else {
      let index = this.commands[name].find((item) => {
        return item === fn
      })
      if (index !== -1) {
        this.commands[name].splice(index, 1)
      }
    }
  }

  //  获取渲染树数据副本
  getCopyData() {
    if (!this.mindMap.renderer.renderTree) return null
    return copyRenderTree({}, this.mindMap.renderer.renderTree, true)
  }
}

export default Command
