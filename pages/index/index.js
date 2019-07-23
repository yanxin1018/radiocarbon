//index.js
//获取应用实例
const app = getApp()
Page({
  data: {
    c14Age:'',
    c14Err:'',
    curve:'',
    disabled:true,
    array: ['IntCal13', 'IntCal04'],
    objectArray: [
      {
        id: 0,
        name: 'IntCal13'
      },
      {
        id: 1,
        name: 'IntCal04'
      }
    ],
    index: 0,
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function () {
    console.log('Load index.');
  },
  onShow: function(){
    console.log("back to index");
  },
  bindRCAgeInput: function(e){
    this.setData({
      c14Age: e.detail.value
    })
    app.globalData.radiocarbonAge=e.detail.value;
    if (this.data.c14Age !== '' && this.data.c14Err !== ''){
      this.setData({disabled:false})
    }else{
      this.setData({disabled:true})
    }
  },
  bindRCErrInput: function (e) {
    this.setData({
      c14Err: e.detail.value
    })
    app.globalData.radiocarbonErr=e.detail.value
    if (this.data.c14Age !== '' && this.data.c14Err !== '') {
      this.setData({ disabled: false })
    } else {
      this.setData({ disabled: true })
    }
  },
  bindPickerChange: function (e) {
    var that=this;
    console.log('picker发送选择改变，携带值为', e.detail.value)
    this.setData({
      index: e.detail.value,
      curve: this.data.array[e.detail.value]
    });
    app.globalData.calibrationCurve = this.data.curve;
  //  console.log('changed index: ' + this.data.index);
  //  console.log('changed curve: ' + this.data.curve);
    
  },
  calibrate: function(e){
    wx.showToast({
      title:"校正中",
      icon:"loading",
      duration:4000
    });
 
    app.globalData.calibrationCurveIdx = this.data.index;
    console.log("Calibration button tapped.");
  //  console.log("Radiocarbon Age: "+ this.data.c14Age+".");
  //  console.log("Radiocarbon Err: " + this.data.c14Err + ".");
  //  console.log("Curve: " + this.data.curve + ".");
    wx.navigateTo({
      url: '../results/results',
      success(){
        console.log('Navigate to results.');
      }
    })
  },
  onShareAppMessage: function (res) {
    if (res.from === 'menu') {
      // 来自页面内转发按钮
      console.log(res.target);
      console.log('sharing')
    }
    return {
      title: '兔十四树轮校正',
      path: '/pages/index/index',
      success: function (res) {
        // 转发成功
      console.log('shared')
      },
      fail: function (res) {
        // 转发失败
      }
    }
  }
})
