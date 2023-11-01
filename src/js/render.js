// -> [0xF9, 0x10, 0x10, 0x63, 0x00, 0x01, 0x04, 0x00, 0x00, 0x00, 0x00];
// <- ['F9', '10', '10', '63', '00', '01', 'E0', 'AF']

// -> [0xF9, 0x03, 0x01, 0x00, 0x00, 0x14]
// <- ['F9', '03', '15', '1A', '03', 'CD', '95', 'F1', '34', '9E', '00', '00', '00', 'CD', '4B', '8C', '05', '00', '00', '00', '00', '22', 'A8', '1A', 'C1', 'B6']
// 

// -> [0xF9, 0x10, 0x10, 0x63, 0x00, 0x01, 0x04, 0xCD, 0x95, 0xF1, 0x34];
// <-  F9 10 10 63 00 01 E0 AF

// -> F9 10 00 6A 00 02 04 00  00 00 00
// <- F9 10 00 6A 00 02 74 6C

// -> F9 03 00 6A  00 04  // - запрос текущего состояния батареи
// 


window.addEventListener('load', () => {
  initRootObj();

  const counter = document.getElementById('counter')

  window.electronAPI.handleCounter((event, value) => {
    const oldValue = Number(counter.innerText)
    const newValue = oldValue + value
    counter.innerText = newValue
    event.sender.send('counter-value', newValue)
  })

  // Получение информации с ком порта
  window.electronAPI.serialHandler((event, value) => {
    const resArr = [];
    value.forEach(element => {
      element.forEach(el => {
        resArr.push(el);
      })
    });
    console.log('%c New Response '+(new Date()) , 'background: #222; color: #bada55');
    console.log('SerialHandler: <<--', getHex(resArr));
    
    let resNumber = 0;
    for(let i = 0; i < resArr.length; i++) {
      resNumber = resNumber | resArr[resArr.length-(1+i)] << (8*i);
    }
    // console.log("SerialHandler: pure ", resNumber);

    responseHandler(resArr);

  });

  const refresh_port_btn = document.getElementById('refresh_port_btn');
  refresh_port_btn.addEventListener('click', () => {
    createSelect();
  });

  const con_discon_btn = document.getElementById('con_discon_btn');
  con_discon_btn.addEventListener('click', () => {
    // disconnectFromPort()
    connectToPort();
  })

  // createSelect handler
  window.electronAPI.getPortsHandler((event, value) => {
    console.log(value);

    const select_port_wrapper = document.getElementById('select-port-wrapper');
    select_port_wrapper.innerHTML =
    `<select id="port_select" class="form-select form-select-sm port-select">
      ${value.map(el=> `<option ${el === "COM12" ? "selected":""} value="${el}">${el}</option>`)}
    </select>`;
  });


  // connectToPort handler
  window.electronAPI.openPortError((event, value) => {
    const {msg, from} = value
    window.rootObj.error = msg;
    window.rootObj.connect = false;
    console.log("Front side openPortError: ", msg);

    const port_status = document.getElementById('port_status');
    port_status.innerText = msg;
    port_status.classList = 'port-status port-status-error';
  })

  window.electronAPI.openPortSuccess(() => {
    console.log("Front side openPortSuccess");
    const port_status = document.getElementById('port_status');
    port_status.innerText = "Подключено";
    port_status.classList = 'port-status port-status-success';
    window.rootObj.connect = true;

    const con_discon_btn = document.getElementById('con_discon_btn');
    con_discon_btn.innerText = "Закрыть";
    con_discon_btn.classList = "btn btn-sm btn-light";
  })
  

  createSelect();

  // Работа с чтением и записью регистров
  const reg_1_write = document.getElementById('reg_1_write');
  reg_1_write.addEventListener('click', () => {
    if (window.rootObj.connect) {
      if(!window.scanning) {
        initRegWrite();
      } else {
        stopWriting();
      }
    }
    
    
  })
})




function createSelect() {
  window.electronAPI.getPorts();
}

function connectToPort(altValue=null) {
  if(!window.rootObj.connect) {
    // Real connection
    const {valueAsNumber: port_baudrate_value} = document.getElementById('port-baudrate');
    let { value } = document.getElementById('port_select');
    if(altValue) value = altValue;
    console.log('value '+value);
    if(value) {
      window.electronAPI.connectToPort({value, port_baudrate_value});
    }
  
  } else {
    // Disconection
    window.electronAPI.disconnectFromPort();
    const port_status = document.getElementById('port_status');
    port_status.innerText = '';
    const con_discon_btn = document.getElementById('con_discon_btn');
    con_discon_btn.innerText = "Открыть";
    con_discon_btn.classList = "btn btn-sm btn-light";
    window.rootObj.connect = false;
  }
}

function initRootObj() {
  window.rootObj = {
    error: null,
    connect: false,
    readReg: null,
  }
}

// function regWrite(pass) {

//   let prev = pass
  
//   // Расчет CRC и подключение его к сообщению.
//   const crcValue = modbusCRC(prev);
//   prev = prev.concat(...crcValue);
  
//   console.log("com res ", getHex(prev));
//   const message = new Uint8Array(prev);
//   window.electronAPI.sendMessage(message);
//   
// }

let deadTimeout;
let stage1Comp = false;
let stage2Comp = false;
let stage3Comp = false;
let stage4Comp = false;
let stage5Comp = false;
let stage6Comp = false;

function stopWriting() {
  clearTimeout(deadTimeout); 
  window.scanning = false;
  const reg_1_write = document.getElementById('reg_1_write');
  reg_1_write.innerText = 'Записать';
  reg_1_write.classList = "btn btn-sm btn-light"
};
function regWrite(pass, register, check = false) {
  let prev = pass;
  
  const crcValue = modbusCRC(prev);
  prev = prev.concat(...crcValue);
  
  const message = new Uint8Array(prev);
  console.log("SerialHandler: -->> ", getHex(prev));
  window.electronAPI.sendMessage(message);
  if(check) {
    window.readReg = register;
    window.writeReg = null;
  } else {
    window.writeReg = register;
    window.readReg = null;
  }
  deadTimeout = setTimeout(() => regWrite(pass, register, check), 100);

}

function initRegWrite() {
  const reg_1_write = document.getElementById('reg_1_write');
  reg_1_write.innerText = 'Стоп';
  reg_1_write.classList = "btn btn-sm btn-dark"

  const battery_data_label = document.getElementById('battery_data_label');
  battery_data_label.innerText = '';

  const stage_label = document.getElementById('stage_label');
  stage_label.innerText = '';

  window.scanning = true;
  clearTimeout(deadTimeout);
  stage1Comp = false;
  stage2Comp = false;
  stage3Comp = false;
  stage4Comp = false;
  stage5Comp = false;
  stage6Comp = false;
  const stage1Write = [0xF9, 0x10, 0x10, 0x63, 0x00, 0x01, 0x04, 0x00, 0x00, 0x00, 0x00];
  regWrite(stage1Write, 0x1063);
}

function responseHandler(arr) {
  // проверка CRC
  const len = arr.length
  const crc = arr[len-2] << 8 | arr[len-1];
  const checkCRC = modbusCRC(arr.slice(0, arr.length-2));
  const checkCRCDec = checkCRC[0] << 8 | checkCRC[1];
  console.log(`crc ${crc.toString(16)} checkCRC ${checkCRCDec.toString(16)}`);

  if(crc == checkCRCDec) {
    console.log("Success crc "+(new Date()));
    // разбор сообщения
    const deviceAdr = arr[0];
    const functionCode = arr[1];
    const highReg = arr[2];
    const lowReg = arr[3];

    const write1063success = functionCode == 0x10 && highReg == 0x10 && lowReg == 0x63;
    const read0100success = functionCode == 0x03 && highReg == 0x15 && (arr.length > 20);
    const write006Asuccess = functionCode == 0x10 && highReg == 0x00 && lowReg == 0x6A;
    const read006Asuccess = functionCode == 0x03 && highReg == 0x04 && (arr.length > 7);
    const write0066success = functionCode == 0x10 && highReg == 0x00 && lowReg == 0x66;

    if(write1063success) {
      
      
      if(window.writeReg === 0x1063 && !stage1Comp) {
        clearTimeout(deadTimeout);
        // 1
        stage1Comp = true;
        console.log('%c STAGE 1 COMPLETE '+(new Date()) , 'background: #FFC0CB; color: #1E90FF')
        setStageLabel(1);

        const pass = [0xF9, 0x03, 0x01, 0x00, 0x00, 0x14]
        setTimeout(() => regWrite(pass, 0x0100, true), 100)
        ;
      }
      console.log("DEBUG STAGE_3_START: "+window.readReg+" "+stage3Comp)
      if(window.writeReg === 0x1063 && !stage3Comp && stage2Comp) {
        clearTimeout(deadTimeout);
        // 3
        stage3Comp = true;
        console.log('%c STAGE 3 COMPLETE '+(new Date()) , 'background: #FFC0CB; color: #1E90FF')
        setStageLabel(3);

        const pass = [0xF9, 0x10, 0x00, 0x6A, 0x00, 0x02, 0x04, 0x00, 0x00, 0x00, 0x00];
        setTimeout(() => regWrite(pass, 0x006A), 100)
      }
      
    }

    if(read0100success) {
      
      
      if(window.readReg === 0x0100 && !stage2Comp && stage1Comp) {
        clearTimeout(deadTimeout);
        // 2
        stage2Comp = true;
        console.log('%c STAGE 2 COMPLETE '+(new Date()) , 'background: #FFC0CB; color: #1E90FF')
        setStageLabel(2);

        const deviceId = arr.slice(5, 9);
        window.deviceId = deviceId;
        console.log("DeviceId: "+getHex(deviceId));
        const pass = [0xF9, 0x10, 0x10, 0x63, 0x00, 0x01, 0x04, ...deviceId];
        console.log("STAGE_3_WRITE_PASS:"+getHex(pass));
        setTimeout(() => regWrite(pass, 0x1063), 100)
      }
      
    }

    if(write006Asuccess) {
      

      if(window.writeReg === 0x006A && !stage4Comp) {
        clearTimeout(deadTimeout);
        // 4 Калбек с записи емкости & Запрос информации о текущей емкости
        stage4Comp = true;
        console.log('%c STAGE 4 COMPLETE '+(new Date()) , 'background: #FFC0CB; color: #1E90FF');
        setStageLabel(4);
        
        const pass = [0xF9, 0x03, 0x00, 0x6A, 0x00, 0x04]
        setTimeout(() => regWrite(pass, 0x006A, true), 100);
      }
      ;
    }

    if(read006Asuccess) {
      
      if(window.readReg === 0x006A && !stage5Comp && stage4Comp) {
        clearTimeout(deadTimeout);
        // 5 Получение информации о текущей емкости & Вызов перезагрузки
        stage5Comp = true;
        console.log('%c STAGE 5 COMPLETE '+(new Date()) , 'background: #FFC0CB; color: #1E90FF');
        setStageLabel(5);

        const batteryData = getHex(arr.slice(3, 7)).reverse().join('');
        const batteryDataInt = parseInt(batteryData, 16);
        window.batteryData = batteryDataInt
        // Вывести данные на DOM
        showBatteryData();
        console.log("BatteryData: ", batteryData);
        const pass = [0xF9, 0x10, 0x00, 0x66, 0x00, 0x01, 0x02, 0x4C, 0x53];
        setTimeout(() => regWrite(pass, 0x0066), 100);
      }
    }

    if(write0066success) {

      if(window.writeReg === 0x0066 && !stage6Comp && stage5Comp) {
        clearTimeout(deadTimeout);
        // 6 Получение информации об успешной перезагрузке. Подчистка.
        stage6Comp = true;
        console.log('%c STAGE 6 COMPLETE '+(new Date()) , 'background: #FFC0CB; color: #1E90FF');
        setStageLabel(6);

        const reg_1_write = document.getElementById('reg_1_write');
        reg_1_write.click();
      }
    }
    
    // if(window.readReg === 0x0100) {
    //   const devType = getHex(arr.slice(3, 5));
    //   const techNumb = getHex(arr.slice(5, 13));
    //   const factoryNumb = getHex(arr.slice(13, 21));
    //   const softVersion = getHex(arr.slice(21, 23));
      
    //   const consoleObj = {deviceAdr, functionCode, bytesNumb, devType, techNumb, factoryNumb, softVersion};
    //   console.log(consoleObj); 
    //   Object.keys(consoleObj).forEach(key => {
    //     if(typeof consoleObj[key] === 'object') {
    //       consoleObj[key] = parseInt(consoleObj[key].reverse().join(''), 16);
    //     }
    //   })
      
    // }
    // if(window.readReg === 0x00AA) {
    //   const radioFreq = getHex(arr.slice(3, 7));
    //   const altRadioParam = getHex(arr.slice(7, 8));
    //   const openWindowTime = getHex(arr.slice(8, 9));
    //   const scanTime = getHex(arr.slice(9, 10));
    //   const transmitPower = getHex(arr.slice(10, 11));
      
    //   const numbAltRadio = parseInt(altRadioParam, 16);
    //   const sf = numbAltRadio & 0b00000111;
    //   const bw = numbAltRadio >> 3;

    //   const consoleObj = {radioFreq, altRadioParamDecode: {sf, bw}, openWindowTime, scanTime, transmitPower};
      
    //   // console.log(consoleObj);
      
    //   consoleObj['radioFreq'] = parseInt(consoleObj['radioFreq'].reverse().join(''), 16);
    //   consoleObj.scanTime = parseInt(scanTime, 16);
    //   consoleObj.transmitPower = parseInt(transmitPower, 16);
    //   consoleObj.openWindowTime = parseInt(openWindowTime, 16);
    //   consoleObj.altRadioParam = parseInt(altRadioParam, 16);
    //   console.log(consoleObj);

    // }
    
  } else {
    console.log("Wrong CRC");
  }
}

function showBatteryData() {
  const battery_data_label = document.getElementById('battery_data_label');
  battery_data_label.innerText = `Использованная емкость⚡: ${window.batteryData}, мкАч`;
   
}

function setStageLabel(data) {
  const stage_label = document.getElementById('stage_label');
  stage_label.innerText = `Выполнено этапов ${data}/6`
}