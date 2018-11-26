import Taro, { Component, Config } from '@tarojs/taro'
import { View, Text, Button, Image } from '@tarojs/components'

import FloatLayot from '../../components/float-layout'
import Panel from '../../components/panel'

import './index.scss'

import utils from '../../utils/utils';
import request from '../../utils/request';

import IAccount from '../../interfaces/account'
import Account from '../../services/edu/account'
import Schedule from '../../services/edu/schedule';

interface ISchedule {
  course_name: string,
  location: string,
  teacher: string,
  sessionText: string,
}

interface IState {
  showJWFloatLayout: boolean,
  showCardFloatLayout: boolean,

  balance: number,
  showBalance: boolean,
  showBalanceLoading: boolean,

  jwVerified: boolean,
  cardVerified: boolean,

  schedule: Array<ISchedule>,
  showSchedule: boolean,  

  notice: string,
  showNotice: boolean,
}

export default class Index extends Component<{}, IState> {

  /**
   * 指定config的类型声明为: Taro.Config
   *
   * 由于 typescript 对于 object 类型推导只能推出 Key 的基本类型
   * 对于像 navigationBarTextStyle: 'black' 这样的推导出的类型是 string
   * 提示和声明 navigationBarTextStyle: 'black' | 'white' 类型冲突, 需要显示声明类型
   */
  config: Config = {
    navigationBarTitleText: '吉珠小助手',
  }
  
  gridItems = [
    {
      id: '0',
      title: '教务系统',
      pageUrl: '',
      bindState: 'showJWFloatLayout',
      imageUrl: require('../../asserts/images/grid_schedule.svg')
    },
    {
      id: '1',
      title: '校园卡',
      pageUrl: '',
      bindState: 'showCardFloatLayout',
      imageUrl: require('../../asserts/images/grid_card.svg')
    },
    {
      id: '2',
      title: '图书查询',
      pageUrl: '/pages/library/search/index',
      imageUrl: require('../../asserts/images/grid_book.svg')
    },
    // {
    //   id: '3',
    //   title: '校历',
    //   pageUrl: '/pages/common/testing/index',
    //   imageUrl: require('../../asserts/images/grid_calendar.svg')
    // },
    {
      id: '4',
      title: '设置',
      pageUrl: '/pages/common/setting/index',
      imageUrl: require('../../asserts/images/grid_settings.svg')
    }
  ]

  state: IState = {
    showJWFloatLayout: false,
    showCardFloatLayout: false,

    balance: 0,
    showBalance: false,
    showBalanceLoading: true,

    jwVerified: false,
    cardVerified: false,

    schedule: [] as Array<ISchedule>,
    showSchedule: false,

    notice: '谢谢你使用吉珠小助手。\n欢迎通过 设置-反馈 提交建议和问题，谢谢！\n另外，通知卡片可以在 设置-界面 里关闭。',
    showNotice: false,
  }

  componentWillMount () {
    const cardSetting = Taro.getStorageSync('cardSetting')
    let state = {}
    
    // foreach 中使用 await 并不会等待 await 后面的函数执行完毕
    for (let item of cardSetting) {
      state[`${item.showKey}`] = item.show
      state[`${item.verifiedKey}`] = Account.checkBindState(item.key)

      if (!item.show) {
        continue
      }

      if (item.showKey === 'showNotice') {
        this.getNotice()
      } else if (item.showKey === 'showBalance') {
        this.getBalance()
      } else if (item.showKey === 'showSchedule') {
        this.getSchedule()
      } 

    }

    this.setState(state, () => {
      const updateManager = Taro.getUpdateManager()
      updateManager.onUpdateReady(async () => {
        console.log('Detect new version')
        const resp = await Taro.showModal({title: '提示', content: '新版本已经准备好，是否重启应用？'})
        if (resp.confirm) {
          updateManager.applyUpdate()
        }
      })
    })
  }
  
  componentDidMount () {
    Taro.eventCenter.on('indexRemount', async () => {
      console.log('Page Index Remount')
      this.setState({balance: 0, schedule: []}, () => {
        this.componentWillMount()
      })
    })
   }

  componentWillUnmount () { }

  componentDidShow () { }

  componentDidHide () { }

  onShareAppMessage () {
    let path = '/pages/index/index'
    return {title: '吉珠小助手', path: path, imageUrl: '../../asserts/images/robot.svg'}
  }

  goto(url: string) {
    Taro.navigateTo({
      url: url
    })
  }

  async getNotice () {
    const response = await request.notice({})

    if (!response || response.data.code == -1) {
      return
    }

    if (response.data.data.notice === '') {
      return
    }

    this.setState({notice: response.data.data.notice})
  }

  async getBalance (quite_mode: boolean = true) {
    const account:IAccount = Account.get()

    if (!account || !Account.checkBindState('card')) {
      return
    }

    const response = await request.cardBalance({quite_mode: quite_mode})

    if (!response || response.data.code == -1) {
      return
    }

    const balance:string = response.data.data.balance
    this.setState({balance: parseFloat(balance), showBalanceLoading: false})
  }

  getSchedule () {
    const rawSchedule = Schedule.GetFormStorage()
    const mySchedule = Taro.getStorageSync('mySchedule')
    const newSchedule = rawSchedule.concat(mySchedule)

    if (!newSchedule) { return }

    const week = utils.getWeek()
    const day = new Date().getDay() || 7 // day 等于 0 时为 7

    const schedule: Array<any> = Schedule.InitSchedule(newSchedule, week, day)
    this.setState({schedule: schedule})
  }

  async gridGotoPage (gridItem) {
    if (gridItem.pageUrl) {
      Taro.navigateTo({
        url: gridItem.pageUrl,
      })
    } else if (gridItem.bindState) {
      // https://github.com/Microsoft/TypeScript/issues/13948
      // setState 在 typescript 里使用计算属性名会报错：找不到属性
      const newState = {} as IState
      newState[gridItem.bindState] =  true
      this.setState(newState)
      if (gridItem.bindState == 'showCardFloatLayout') {
        this.getBalance()
      }
    }
  }

  handleClose (type: keyof IState) {
    const newState = {} as IState
    newState[type] = false
    this.setState(newState)
  }

  handleRightTipClick (type) {
    const actions = {
      feedback: '/pages/common/setting/index',
      schedule: '/pages/edu/schedule/core/index',
      transaction: '/pages/card/transaction/index'
    }
    Taro.navigateTo({url: actions[type]})
  }

  render () {
    const {balance, showBalanceLoading, showBalance, schedule, showSchedule, jwVerified, cardVerified, showJWFloatLayout, showCardFloatLayout, notice, showNotice} = this.state

    const helloPanel = (!jwVerified && !cardVerified) ? (
      <Panel title='你好，世界' none={false} nonText={`感谢参与 吉珠课表 的内测`}>
        <View className='bind-tip' onClick={this.goto.bind(this, '/pages/common/bind/index')}><Text>点击绑定以启用更多服务</Text></View>
      </Panel>
    ) : null
    
    const noticePanel = showNotice ? (
      <Panel title='通知'>
        <View className="notice">
          <Text className="">{notice}</Text>
        </View>
      </Panel>
    ): null

    const schedulePanel = showSchedule ? (
      <Panel title='今日课表' none={schedule.length === 0} nonText='今天没有课哦😄' rightTip='课程表' onRightTipClick={this.handleRightTipClick.bind(this, 'schedule')}>
        <View className='card-schedule'>
          {
            schedule.map((item, index) => {
              return (
                <View className='card-schedule__item' key={index}>
                  <View className='card-schedule__item__session'>{item.sessionText}</View>
                  <View className='card-schedule__item__info'>
                    {item.course_name}
                    <View className='card-schedule__item__teacher'>{item.teacher}</View>
                  </View>
                  <View className='card-schedule__item__location'>{item.location}</View>
                </View>
              )
            })
          }
        </View>
      </Panel>
    ) : null

    const balancePanel = showBalance ? (
      <Panel title='校园卡余额' none={!cardVerified? true: false} nonText='还未绑定校园卡账号哦😏' rightTip={`${this.state.cardVerified ? '消费记录': ''}`}  onRightTipClick={this.handleRightTipClick.bind(this, 'transaction')}>
        <View className='card-balance'>
          <Text className='card-balance__text'>{showBalanceLoading ? '' : `￥${balance}`}</Text>
        </View>
      </Panel>
    ) : null

    const gridItems = this.gridItems
    const gridItemMap = gridItems.map((gridItem) => {
      return (
        <View key={gridItem.id} className='grid__item' onClick={this.gridGotoPage.bind(this, gridItem)}>
          <Image src={gridItem.imageUrl} />
          <Text>{gridItem.title}</Text>
        </View>
      )
    })
    const gridPanel = (
      <Panel title='Magic Box' none={false}>
        <View className='grid'>
          {gridItemMap}
        </View>
      </Panel>
    )

    return (
      <View className='home-page'>
        <View>
          {noticePanel}
          {helloPanel}
          {schedulePanel}
          {balancePanel}
          {gridPanel}
        </View>
        <FloatLayot title='教务' isOpened={showJWFloatLayout} onClose={this.handleClose.bind(this, 'showJWFloatLayout')}>
            <Panel title='功能' marginBottom={0} padding='20rpx 20rpx 30rpx;'>
              <View className='schedule-btn-group'>
              <View className='inline'>
                <Button className='btn left' onClick={this.goto.bind(this, '/pages/edu/schedule/core/index')}>课程表</Button>
                <Button className='btn right' onClick={this.goto.bind(this, '/pages/edu/schedule/search/index')}>设置</Button>
              </View>
                <Button className='btn' onClick={this.goto.bind(this, '/pages/edu/score/index')}>教务成绩</Button>
              </View>
            </Panel>
          </FloatLayot>
          <FloatLayot title='校园卡' isOpened={showCardFloatLayout} onClose={this.handleClose.bind(this, 'showCardFloatLayout')}>
            <View>
              <Panel title='余额' marginBottom={0} rightTip={`${cardVerified ? '刷新': ''}`} onRightTipClick={this.getBalance.bind(this, false)}>
                <View className='flex-center'>
                {cardVerified
                  ? <Text className='card-balance__text'>￥{balance}</Text>
                  : <Text className='not-bind-tip'>还未绑定校园卡账号</Text>
                }
                </View>
              </Panel>
              <Panel title='功能' marginBottom={0} padding='20rpx 20rpx 30rpx;'>
                <Button className='btn' onClick={this.goto.bind(this, '/pages/card/transaction/index')}>查询消费记录</Button>
              </Panel>
            </View>
          </FloatLayot>
      </View>
    )
  }
}

