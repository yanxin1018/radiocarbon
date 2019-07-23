const app = getApp();
Page({
  data: {
    c14Age: '',
    c14Err: '',
    curveName: '',
    curveCuttd:'',
    result1Sigma: '',
    result2Sigma: '',

    agePrecision:1,
    format:'CalBC/AD',
    roundOpts: [
      { name: '1', value: '1', checked: 'true' },
      { name: '5', value: '5', },
      { name: '10', value: '10' },
    ],
    formatOpts: [
      { name: 'CalBC/AD', value: 'CalBC/AD', checked: 'true' },
      { name: 'CalBP', value: 'CalBP', },
    ]
  },

  onLoad: function() {
    this.setData({
      c14Age: app.globalData.radiocarbonAge,
      c14Err: app.globalData.radiocarbonErr,
      curveName: app.globalData.calibrationCurve,
      curveSelected: app.globalData.curves[app.globalData.calibrationCurveIdx]
    });
    console.log('c14Age: ' + this.data.c14Age);
    console.log('c14Err: ' + this.data.c14Err);
    console.log('curveName: ' + this.data.curveName);
    console.log('curveSelected: ' + app.globalData.curves[app.globalData.calibrationCurveIdx].name);
    console.log("before cutting:");
    console.log(this.data.curveSelected);
    var curveCut=this.cutCurve(this.data.curveSelected, this.data.c14Age, this.data.c14Err, 5);
    this.setData({
      curveCutted:curveCut
    })
    var precisionInter=0.1;
    if(this.data.c14Err>=100){
      precisionInter=1;
    }
    var curveExpand=this.linearIntcep(this.data.curveCutted,5,precisionInter);
    
    this.setData({
      curve:curveExpand
    })
    this.calibrate(this.data.c14Age, this.data.c14Err, this.data.curve, this.data.agePrecision,this.data.format);
  },
  calibrate: function(c14Age, c14Err, curve, precision,format) {
  //  console.log("test format in calibrate: " +format);
    console.log("Calibrating");
    var idxH = this.findIdx(c14Age, 5, curve, 0.5);
    //  console.log("idx of corresponding c14 age plus minus 5 years: "+idxH);
    var c14ErrMean = this.meanErr(c14Err, curve, idxH);
    //   console.log("averaged error (sqrted): " + c14ErrMean);
    var k = 8;
    var idxKsigma = this.findIdx(c14Age, c14ErrMean, curve, k);
    //  console.log("idx of corresponding c14 age range 8 sigma: "+ idxKsigma);
    var range3Calendar = this.findCalendarRange(curve, idxKsigma);
    //  console.log("calendar ages in 3 sigma: " + range3Calendar);
    var range3RC = this.findRCRange(curve, idxKsigma);
    //  console.log("radiocarbon ages in 3 sigma: " + range3RC);
    var probability3Sigma = this.calculateProbability(c14Age, c14ErrMean, range3Calendar, range3RC);
    //  console.log("probability normalized to 3 sigma: "+ probability3Sigma);
    var probabilityDescend = this.sortArrayDescend(probability3Sigma);
    var probabilityArray = [];
    var probabilityArrayIdx = [];
    for (let i = 0; i < probability3Sigma.length; i++) {
      probabilityArray.push(probabilityDescend[i].value);
      probabilityArrayIdx.push(probabilityDescend[i].idx);
    };
    //  console.log("sorted array index: "+probabilityArrayIdx);
    var proB = 0;
    var id = 0;
    var sigma1Thresh = 0;
    var sigma2Thresh = 0;
    for (id = 0; id < probability3Sigma.length; id++) {
      if (proB <= 0.682) {
        proB = proB - (-probabilityArray[id])
      } else {
        sigma1Thresh = id; //this is the number of elements, not real index!
        break
      }
    };
    for (let id2 = id; id2 < probability3Sigma.length; id2++) {
      if (proB <= 0.954) {
        proB = proB - (-probabilityArray[id2])
      } else {
        sigma2Thresh = id2; //this is the number of elements, not real index!
        break
      }
    };
    //  console.log("accumulated probability: " + proB);
    //  console.log("sigma 1 thresh: "+sigma1Thresh);
    //  console.log("sigma 2 thresh: " + sigma2Thresh);
    var range1Sigma = this.filterRange(idxKsigma, probabilityArrayIdx, sigma1Thresh);
    //  console.log('Filtered sigma 1 idx: '+ range1Sigma);
    var range2Sigma = this.filterRange(idxKsigma, probabilityArrayIdx, sigma2Thresh);
    //  console.log('Filtered sigma 2 idx: ' + range2Sigma);
    var range1Calendar = this.findCalendarRange(curve, range1Sigma);
    //  console.log("calendar ages in 1 sigma: " + range1Calendar);
    var range2Calendar = this.findCalendarRange(curve, range2Sigma);
    //  console.log("calendar ages in 2 sigma: " + range2Calendar);
    var probability1SigmaIdx = this.filterProbIdx(probabilityArrayIdx, sigma1Thresh);
    //  console.log("filtered 1 sigma probability index:"+probability1SigmaIdx);
    var probability1Sigma = this.filterProb(probability3Sigma, probability1SigmaIdx);
    //  console.log("probability distribution in 1 sigma: " +probability1Sigma);
    var probability2SigmaIdx = this.filterProbIdx(probabilityArrayIdx, sigma2Thresh);
    //  console.log("filtered 2 sigma probability index:" + probability2SigmaIdx);
    var probability2Sigma = this.filterProb(probability3Sigma, probability2SigmaIdx);
    //  console.log("probability distribution in 2 sigma: " + probability2Sigma);
    var rangeOfPlot = this.filterProbPlot(probability3Sigma);
    //  console.log("idx of probabilities for plotting: " + rangeOfPlot);
    var calendarYearsPlot = this.filterCalendarPlot(range3Calendar, rangeOfPlot);
    //  console.log("calendar ages filtered to be plotted: "+calendarYearsPlot);
    var yearLeft = this.findLimPlot(calendarYearsPlot, "left", 50);
    //  console.log("Year lim at left: " +yearLeft);
    var yearRight = this.findLimPlot(calendarYearsPlot, "right", 50);
    //  console.log("Year lim at right: " + yearRight);
    var idxCalendar = this.filterIdxWithinLimit(curve, yearLeft, yearRight);
    //  console.log("filtered calendar age indexes: " + idxCalendar);
    var ageCalendar = this.filterAgesWithinLimit(curve, idxCalendar);
    //  console.log("filtered calendar ages: "+ageCalendar);
    var ageRCLow = this.filterRCWithinLimit(curve, idxCalendar, "low");
    //  console.log("filtered radiocarbon age lower: "+ageRCLow);
    var ageRCUp = this.filterRCWithinLimit(curve, idxCalendar, "up");
    //  console.log("filtered radiocarbon age upper: " + ageRCUp);
    var outPut1Sig = this.splitOutput(range1Calendar, probability1Sigma,precision,format);
    this.setData({
      result1Sigma: outPut1Sig
    });
    console.log("1 sigma final output: ");
    console.log(this.data.result1Sigma);
    var outPut2Sig = this.splitOutput(range2Calendar, probability2Sigma, precision,format);
    this.setData({
      result2Sigma: outPut2Sig
    });
    console.log("2 sigma final output: ");
    console.log(this.data.result2Sigma);
  },
  cutCurve:function(curve, c14Age,c14Err,span){
    var x=curve.rcAge;
    var calendarCut=[];
    var rcAgeCut=[];
    var rcErrCut=[];
    var lowerB=c14Age-span*c14Err;
    var upperB=c14Age-(-span*c14Err);
    for(let i=0;i<x.length;i++){
      if(x[i]>lowerB && x[i]<upperB){
        calendarCut.push(curve.calendarAge[i]);
        rcAgeCut.push(curve.rcAge[i]);
        rcErrCut.push(curve.rcErr[i]);
      }
    }
    var newCurve={
      calendarAge:calendarCut,
      rcAge:rcAgeCut,
      rcErr:rcErrCut,
    }
    console.log("cutted:");
    console.log(newCurve);
    return newCurve;
  },
  findIdx: function(c14Age, c14Err, curve, k) {
    var idx = [];
    var lowerT = c14Age - k * c14Err;
    var upperT = c14Age - k * (-c14Err);
    for (let i = 0; i < curve.rcAge.length; i++) {
      if (curve.rcAge[i] <= upperT & curve.rcAge[i] >= lowerT) {
        idx.push(i);
      }
    };
    return idx;
  },
  meanErr: function(c14Err, curve, idx) {
    var errSum = 0;
    for (let i = 0; i < idx.length; i++) {
      errSum = errSum - (-curve.rcErr[idx[i]]);
    }
    //  console.log("sum of errors: ", errSum);
    var errAverage = errSum / idx.length;
    var errSquare = c14Err * c14Err;
    var errAverageSquare = errAverage * errAverage;
    var errMeanSquare = errSquare - (-errAverageSquare);
    var errMean = Math.sqrt(errMeanSquare);
    return errMean;
  },
  filterRange: function(idx, idxSorted, thresh) {
    //  console.log('called filter funtion');
    var idxFiltered = [];
    for (let i = 0; i < thresh; i++) {
      idxFiltered.push(idxSorted[i]);
    }
    var idxOutput = [];
    for (let j = 0; j < thresh; j++) {
      var id = idxSorted[j];
      idxOutput.push(idx[id]);
    };
    return idxOutput;
  },
  filterProbIdx: function(arr, thresh) {
    var idxOutput = [];
    for (let i = 0; i < thresh; i++) {
      idxOutput.push(arr[i]);
    };
    return idxOutput;
  },
  filterProbPlot: function(prob) {
    var idx = [];
    var probMax = Math.max(...prob);
    //  console.log("maximum probability: "+probMax);
    var probThresh = probMax / 100000;
    for (let i = 0; i < prob.length; i++) {
      if (prob[i] >= probThresh) {
        idx.push(i);
      }
    }
    return idx;
  },
  findCalendarRange: function(curve, idx) {
    var range = [];
    for (let i = 0; i < idx.length; i++) {
      range.push(curve.calendarAge[idx[i]]);
    }
    return range;
  },
  findRCRange: function(curve, idx) {
    var range = [];
    for (let i = 0; i < idx.length; i++) {
      range.push(curve.rcAge[idx[i]]);
    }
    return range;
  },
  calculateProbability: function(c14Age, c14Err, range3Calendar, range3RC) {
    var probability = [];
    var density = [];
    var densityTotal = 0;
    var probabilityTotal = 0;
    for (let i = 0; i < range3Calendar.length; i++) {
      var a = range3RC[i] - c14Age;
      var b = a * a;
      var c = b / c14Err;
      var d = c / c14Err;
      var e = -0.5 * d;
      var f = Math.exp(e);
      density.push(f);
      densityTotal = densityTotal - (-f);
    };
    for (let i = 0; i < range3Calendar.length; i++) {
      var probR = density[i] / densityTotal;
      var prob = probR;
      probability.push(prob);
      probabilityTotal = probabilityTotal + prob;
    };
    return probability;
  },
  filterProb: function(probability, range) {
    var probabilityFiltered = [];
    for (let i = 0; i < range.length; i++) {
      probabilityFiltered.push(probability[range[i]]);
    };
    return probabilityFiltered;
  },
  sortArrayDescend: function(arr) {
    var arrayObj = [];
    for (let i = 0; i < arr.length; i++) {
      arrayObj.push({
        value: arr[i],
        idx: i
      })
    };
    var temp;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i; j < arr.length; j++) {
        if (arrayObj[j].value > arrayObj[i].value) {
          temp = arrayObj[i];
          arrayObj[i] = arrayObj[j];
          arrayObj[j] = temp;
        }
      };
    };
    return arrayObj;
  },
  sortArrayAscend: function(arr) {
    var arrayObj = [];
    for (let i = 0; i < arr.length; i++) {
      arrayObj.push({
        value: arr[i],
        idx: i
      })
    };
    var temp;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i; j < arr.length; j++) {
        if (arrayObj[j].value < arrayObj[i].value) {
          temp = arrayObj[i];
          arrayObj[i] = arrayObj[j];
          arrayObj[j] = temp;
        }
      };
    };
    return arrayObj;
  },
  filterCalendarPlot: function(ages, idx) {
    var filteredCalendar = [];
    for (var i = 0; i < idx.length; i++) {
      filteredCalendar.push(ages[idx[i]]);
    }
    return filteredCalendar;
  },
  findLimPlot: function(years, method, thresh) {
    var yearDivided = [];
    for (let i = 0; i < years.length; i++) {
      var temp = years[i] / thresh;
      yearDivided.push(temp);
    }
    var min = Math.min(...yearDivided);
    var max = Math.max(...yearDivided);
    if (method == "left") {
      var yearFloored = Math.floor(min);
      var left = yearFloored * 50;
      return left;
    } else if (method == "right") {
      var yearCeiled = Math.floor(max);
      yearCeiled++;
      var right = yearCeiled * 50;
      return right;
    } else {
      return -1;
    }
  },
  filterIdxWithinLimit: function(curve, left, right) {
    var idx = [];
    for (let i = 0; i < curve.calendarAge.length; i++) {
      if (curve.calendarAge[i] <= right && curve.calendarAge[i] >= left) {
        idx.push(i);
      }
    };
    return idx;
  },
  filterAgesWithinLimit(curve, idxCalendar) {
    var ages = [];
    for (let i = 0; i < idxCalendar.length; i++) {
      ages.push(curve.calendarAge[idxCalendar[i]]);
    }
    return ages;
  },
  filterRCWithinLimit: function(curve, idx, method) {
    var ages = [];
    for (let i = 0; i < idx.length; i++) {
      var rc = curve.rcAge[idx[i]];
      var err = curve.rcErr[idx[i]];
      if (method == "low") {
        var rcLow = rc - err;
        ages.push(rcLow);
      } else if (method == "up") {
        var rcUp = rc - (-err);
        ages.push(rcUp);
      }
    }
    return ages;
  },
  splitOutput: function(age, probability,precision,format) {
    //console.log("test format inSplitOutput: "+ format);
    var len = age.length;
    var outputArray = {
      left: [],
      right: [],
      percentage: []
    }
    var sorted = this.sortArrayAscend(age);
    var sortedAge = [];
    var sortedIdx = [];
    for (let i = 0; i < age.length; i++) {
      sortedAge.push(sorted[i].value);
      sortedIdx.push(sorted[i].idx);
    }
    //  console.log("sorted 1 sigma calendar age: "+sortedAge);
    var prob = this.filterCalendarPlot(probability, sortedIdx);
    //  console.log("sorted 1 sigma probability:"+prob);
    var diffArray = [];
    var idxSplit = [0]; //this is the index of the item after the gap
    for (let j = 1; j < sortedAge.length; j++) {
      var diff = sortedAge[j] - sortedAge[j - 1];
      diffArray.push(diff);
      var splitThresh = precision*2;
      if (diff > splitThresh) {
        idxSplit.push(j);
      }
    }
    var parts = idxSplit.length
    //  console.log("sigma 1 range splitted into: "+parts);
    if (parts == 1) {
      outputArray.left.push(sortedAge[0]);
      outputArray.right.push(sortedAge[len - 1]);
      var percentage = this.sumValue(prob);
      outputArray.percentage.push(percentage);
      //  console.log(outputArray);
    } else {
      outputArray.left.push(sortedAge[0]);
      outputArray.right.push(sortedAge[idxSplit[1] - 1]);
      var percentage = this.sumValueBetweenIdx(prob, 0, idxSplit[1]); //not include the end item
      outputArray.percentage.push(percentage);
      for (let k = 1; k < parts - 1; k++) {
        outputArray.left.push(sortedAge[idxSplit[k]]);
        outputArray.right.push(sortedAge[idxSplit[k + 1] - 1]);
        var percentage = this.sumValueBetweenIdx(prob, idxSplit[k], idxSplit[k + 1]);
        outputArray.percentage.push(percentage);
      }
      outputArray.left.push(sortedAge[idxSplit[parts - 1]]);
      outputArray.right.push(sortedAge[len - 1]);
      var percentage = this.sumValueBetweenIdx(prob, idxSplit[parts - 1], len - 1); //not include the end item
      outputArray.percentage.push(percentage);
    //  console.log("test outputarray:");
    //  console.log(outputArray);
    }
    var outFormatted = [];
    for (let p = 0; p < parts; p++) {
      var roundedAge = this.roundAge(outputArray.left[p], outputArray.right[p], precision,format);
      var roundedP = this.roundPercentage(outputArray.percentage[p]);
      outFormatted.push({
        left: roundedAge[0],
        right: roundedAge[1],
        percentage: roundedP
      })
    }
    return outFormatted;

  },
  sumValueBetweenIdx: function(arr, idL, idR) {
    var sum = 0;
    for (var i = idL; i < idR; i++) {
      sum = sum - (-arr[i]);
    }
    return sum;
  },
  sumValue: function(arr) {
    var sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum = sum - (-arr[i]);
    }
    return sum;
  },
  roundAge: function(left, right, unit,format) {
    var roundedAge = [];
    var ageLeft = Math.floor(left / unit) * unit;
    var ageRight = Math.floor(right / unit) + 1;
    ageRight *= unit;
  //  console.log("test global format: "+this.data.format);
  //  console.log("test local format: "+format);
    if(format==="CalBC/AD"){
      if (ageLeft > 0 && ageRight > 0) {
        roundedAge.push(ageLeft);
        roundedAge.push(ageRight + ' CalAD');
      } else if (ageLeft < 0 && ageRight < 0) {
        roundedAge.push(Math.abs(ageLeft));
        roundedAge.push(Math.abs(ageRight) + ' CalBC');
      } else {
        roundedAge.push(Math.abs(ageLeft) + ' CalBC');
        roundedAge.push(ageRight + ' CalAD');
      }
    }else if(format==="CalBP"){
      ageLeft=1950-ageLeft;
      ageRight = 1950-ageRight;
      roundedAge.push(ageLeft);
      roundedAge.push(ageRight + ' CalBP');
    } 
    return roundedAge;
  },
  roundPercentage: function(num) {
    var numPercent = num * 10000
    numPercent = Math.round(numPercent);
    numPercent /= 100;
    return numPercent + "%";
  },
  roundChange: function (e) {
    console.log('radio发生change事件，携带value值为：', e.detail.value);
    this.setData({ agePrecision:e.detail.value});
    this.calibrate(this.data.c14Age, this.data.c14Err, this.data.curve, this.data.agePrecision,this.data.format);
  },
  formatChange: function (e) {
    console.log('radio发生change事件，携带value值为：', e.detail.value);
    this.setData({ format: e.detail.value });
    this.calibrate(this.data.c14Age, this.data.c14Err, this.data.curve, this.data.agePrecision,this.data.format);
  },
  linearIntcep: function (curve, step, pres) {
    var xx = [];
    var yy = [];
    var zz=[];
    var x=curve.calendarAge;
    console.log("x:");
    console.log(x);
    var y=curve.rcAge;
    console.log("y:");
    console.log(y);
    var z=curve.rcErr;
    console.log("z:");
    console.log(z);
    var mag = step / pres;
    var lenNew = (x.length - 1) * mag + 1;
    for (let i = 0; i < x.length - 1; i++) {
      var currentY = y[i];
      var currentX = x[i];
      var currentZ=z[i];
      var currentIntvX = x[i + 1] - x[i];
      var currentIntvY = y[i + 1] - y[i];
      var currentIntvZ = z[i + 1] - z[i];
      for (let j = 0; j < mag; j++) {
        var accX = j / mag * currentIntvX;
        var currentXX = accX - (-currentX);
        var accY = j / mag * currentIntvY;
        var currentYY = accY - (-currentY);
        var accZ = j / mag * currentIntvZ;
        var currentZZ = accZ - (-currentZ);
        xx.push(currentXX);
        yy.push(currentYY);
        zz.push(currentZZ);
      }
    }
    xx.push(x[x.length - 1]);
    yy.push(y[y.length - 1]);
    zz.push(z[z.length - 1]);
    console.log("expaned x:");
    console.log(xx);
    console.log("expaned y:");
    console.log(yy);
    console.log("expaned z:");
    console.log(zz);
    var curveExpand={};
    curveExpand.calendarAge=xx;
    curveExpand.rcAge=yy;
    curveExpand.rcErr=zz;
    return curveExpand;
  },
  onShareAppMessage: function(res) {
    if (res.from === 'menu') {
      // 来自页面内转发按钮
      //      console.log(res.target);
      //      console.log('sharing')
    }
    return {
      title: '我用兔十四校正了一个数据',
      path: '/pages/index/index',
      success: function(res) {
        // 转发成功
        //        console.log('shared')
      },
      fail: function(res) {
        // 转发失败
      }
    }
  },
})