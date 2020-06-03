$(document).ready(function() {


    //ceartain global values 
    const pmax = 65535
    const nmax = -65536 // equivalent to minus zero
    const reg_number = 16 // number of alu registers
    const feg_number = 6 // number of cache registers
    const add_rs_number = 8 // reservation station for addition.
    const mult_rs_number = 3 // reservation number for multipliers
    const load_rs_number = 4
    const store_rs_number = 4
    const bin_rs_number = 4
    const add_mod_number = 4
    const mult_mod_number = 3
    const bin_mod_number = 5
    const load_mod_number = 3
    const freg_number = 6
    const fps = 1;
    const add_t = 3;
    const mult_t = 10;
    const load_t = 2;
    const store_t = 2;
    const bin_t = 3;

    var c = document.getElementById("canvas");
    var ctx = c.getContext("2d");
    ctx.beginPath();

    function int16(v) {
        return (v << 16) >> 16;
    }

    // obtaining the register values 

    // function tests() {
    //     var r0 = parseInt(document.getElementById("R0").value);
    //     var r1 = parseInt(document.getElementById("R1").value);
    //     console.log(r0 + r1);
    // }


    // const buffer = new ArrayBuffer(10);
    // const view = new DataView(buffer);

    // view.setUint16(0, -2.5);
    // console.log(getFloat16(view, 0)); // 0.0007572174072265625

    // // You can append to DataView instance
    // view.getFloat16 = (...args) => getFloat16(view, ...args);
    // view.setFloat16 = (...args) => setFloat16(view, ...args);

    // console.log(view.getFloat16(0), " the actual view of the thing"); // 0.0007572174072265625

    // view.setFloat16(0, Math.PI, true);
    // view.getFloat16(0, true); // 3.140625

    // const float16 = new Float16Array([1.0, -1.1, 1.2]);
    // for (const val of float16) {
    //     console.log(val); // => 1, 1.099609375, 1.19921875
    // }
    // console.log(float16[1]);
    // console.log("sfsfdsffds ", float16[0] + float16[2]);
    // var pre = new Float16Array(float16[0] + float16[2])
    // console.log('prev', pre[1]);
    // console.log(1.0 + -1.1);
    // console.log(float16.reduce((prev, current) => prev + current));

    // console.log("______________________TEST_____________________________________________");

    // tests();

    ////////////////// register //////////////////////////////
    // cpu registers
    function create_FRegisters(i) {
        return {
            value: int16(parseInt(document.getElementById("R" + i).value)),
            tag: 0,
            lock: false
        };
    }

    // cahce regiaters
    function create_CRegisters(i) {
        return {
            value: int16(parseInt(document.getElementById("F" + i).value)),
            lock: false, // for now no cahce misses
        }
    }

    ////////////////// resrvation stations ///////////////////////////////

    class add_rs {
        constructor() {
            this.r1 // the actual register
            this.r2
            this.finish = true;
            this.opcode
            this.dst
            this.ip = -1
            this.pos1
            this.pos2
            this.pos3
        }
        check() {
            if (this.r1.lock || this.r2.lock)
                return true;
            return false;
        }
    }

    class mult_rs {
        constructor() {
            this.r1 // the actual register
            this.r2
            this.finish = true;
            this.opcode
            this.dst
            this.ip = -1
            this.pos1
            this.pos2
            this.pos3
        }
        check() {
            if (this.r1.lock || this.r2.lock)
                return true;
            return false;
        }
    }

    class bin_rs {
        constructor() {
            this.r1 = null; // the register 
            this.r2 = null;
            this.dst = null;
            this.finish = true; // initially not occupied
            this.ip = -1;
            this.time;
            this.pos1
            this.pos2
            this.pos3
        }
        check() {
            if (this.r1.lock) {
                if (this.r2 == null) return true;
                else if (this.r2.lock) return true;
            }
            return false;
        }
    }

    class load_rs {
        constructor() {
            this.r1 = null; // the register it will use if any
            this.f1; // the memory unit it will accesss
            this.value;
            this.finish = true; // indiactes that it is available for use
            this.ip = -1;
            this.time;
            this.additional_condition;
            this.pos1
            this.pos2
            this.pos3
        }
        check() {
            if (this.f1.lock)
                return true;
            return false;
        }
    }

    class store_rs {
        constructor() {
            this.r = null; // the register
            this.f = null; // the memory
            this.finish = true;
            this.ip = -1;
            this.time;
            this.pos1
            this.pos2
            this.pos3
        }
        check() {
            if (this.r.lock)
                return true;
            return false;
        }
    }


    ///////////////////////Instruction Unit//////////////////////////////////

    // we will consider number of executable instructions at max = 6 (reg_number)
    class instructions {
        constructor(inst_list) {
            let str = inst_list.split(" ");
            this.operation = str[0]
            this.dst = str[1]
            this.reg1 = str[2]
            this.reg2 = 0 // may be a register or an incermental value
            this.additional_condition
            this.tagline = str;
            if (this.operation !== "LOAD") {
                this.reg2 = (str.length > 3) ? str[3] : 0
            } else {
                // in case of load/store instructions
                let sp_inst = "";
                for (let i = 2; i < str.length; i++) {
                    sp_inst = sp_inst + str[i];
                }
                if (sp_inst.length > 3) {
                    // checking for the operations 
                    let pattern = /[+*-]/g;
                    let n = sp_inst.search(pattern);
                    this.additional_condition = sp_inst[n];
                    this.reg1 = sp_inst.substring(0, n).replace(/\s/g, '');
                    this.reg2 = sp_inst.substring(n + 1, sp_inst.length).replace(/\s/g, '');
                }
            }
            this.issue_time = 0
            this.exe_time = 0
            this.write_time = 0
            this.rs_tag = -1 // reservation tag
            this.finished = false // to indicate termination 
        }

        wireCheck() {
            return this.finished;
        }
    }

    //////////////////Building Blocks ///////////////////////////////////////

    //there are in build bit wise operation function in js


    ////////////////////////// the ALU //////////////////////////////////
    class add_mod {

        constructor(r1, r2, r3, time, tag) {
            this.a = r1;
            this.b = r2;
            this.dst = r3;
            this.tag = tag; // the index for the instrction 
            this.time = time;
            this.inuse = true;
        }

        addition() {
            if (this.a + this.b < pmax && this.a + this.b >= nmax) {
                // console.log("The summation is ", this.a + this.b);
                return int16(this.a + this.b);
            }
            return 0;
        }

        addition_without_carry() {
            var result = 0,
                x = 1;
            while (this.a > 0 && this.b > 0) {
                result += x * ((this.a + this.b) % 10);
                this.a = Math.floor(this.a / 10);
                this.a = Math.floor(this.a / 10);
                x *= 10;
            }
            return int16(result);
        }

        subtraction() {
            if (Math.abs(this.a - this.b) < pmax && Math.abs(this.a - this.b) >= nmax) {
                return int16(this.a - this.b);
            }
            return 0;
        }
        subtraction_without_borrow() {
            if (Math.abs(this.a - this.b) < pmax && Math.abs(this.a - this.b) >= nmax && this.a >= this.b) {
                return int16(this.a ^ this.b);
            }
            return 0;
        }
    }

    class mult_mod {

        constructor(r1, r2, r3, time, tag) {
            this.a = r1;
            this.b = r2;
            this.dst = r3;
            this.tag = tag; // the index for the instrction 
            this.time = time;
            this.inuse = true;
        }

        multiplication() {
            return int16(this.a * this.b);
        }
    }

    class bin_mod {
        constructor(r1, r3, time, tag, r2 = null) {
            this.a = r1;
            this.b = r2;
            this.dst = r3;
            this.tag = tag;
            this.time = time;
            this.inuse = true;
        }
        complement() {
            return int16(~this.a);
        }
        xor() {
            return int16(this.a ^ this.b);
        }
        nand() {
            return int16(~(this.a & this.b));
        }
        lshift() {
            return int16(this.a << this.b);
        }
        rshift() {
            return int16(this.a >>> this.b);
        }
    }


    ////////////////// Certain useful functions ////////////
    function check_full(mod, limit) {
        for (let i = 0; i < limit; i++) {
            if (typeof mod[i] === 'undefined')
                return i;
        }
        return -1;
    }

    function mod_release(module, i) {
        delete module[i];
    }


    ////////////////////////////////////////////////
    //////// The Working ////////////////////////////
    /////////////////////////////////////////////////

    ////////// variables declarations

    // a container for all the instructions
    var test = [];

    // the global time keeper


    // read the instructions
    var x = document.getElementById("frm1");
    for (let i = 0; i < x.length; i++) {
        test.push(new instructions(x.elements[i].value));
    }

    test.forEach(element => {
        console.log("At first ", element);
    });

    // making alu registers
    var reg = [];
    for (var i = 0; i < reg_number; i++) {
        reg.push(create_FRegisters(i));
    }
    //making cahce registers
    var feg = [];
    for (let i = 0; i < feg_number; i++) {
        feg.push(create_CRegisters(i));
    }



    // making the reservation stations 
    // ------- for add/sub operations
    var rs_add = [];
    for (let i = 0; i < add_rs_number; i++) {
        rs_add.push(new add_rs())
    }
    // --------- for multiplication 
    var rs_mult = [];
    for (let i = 0; i < mult_rs_number; i++) {
        rs_mult.push(new mult_rs())
    }
    // --------- for binary operations
    var rs_bin = [];
    for (let i = 0; i < bin_rs_number; i++) {
        rs_bin.push(new bin_rs())
    }
    // --------- for load
    var rs_load = [];
    var rs_store = [];


    // making the alu modules
    var mod_adder = [];
    var mod_mult = [];
    var mod_bin = [];

    var clk = 0;
    var incomplete = true;
    var stopper = 0;

    //coloring the wires  (sad truth)
    var trs3 = 0;
    var the_green_table = 0;

    ////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////
    /////////////// function settings ////////////////////////////////////////

    var interval;
    document.getElementById('button').addEventListener("click", function() {
        interval = setInterval(working, 1000 * fps);
    })

    function working() {
        //////// running stage of the application

        // the instruction queue :     
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'blue';

        // connection to load and store 
        ctx.moveTo(675 - 250, 230);
        ctx.lineTo(675 - 250, 260);
        ctx.lineTo(500 - 250, 260);
        ctx.lineTo(500 - 250, 300);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#ff1ac6';
        ctx.moveTo(250, 300);
        ctx.lineTo(275, 300);
        ctx.lineTo(275, 350);
        ctx.moveTo(250, 300);
        ctx.lineTo(175, 300);
        ctx.lineTo(175, 350);
        ctx.stroke();
        //the rest of the connections from the instruction queue
        ctx.beginPath();
        ctx.strokeStyle = test.some((x) => x.finished) ? '#33ccff' : 'blue';
        ctx.moveTo(675 - 250, 230);
        ctx.lineTo(675 - 250, 430);
        ctx.stroke();

        //  > connection to rs 1
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.moveTo(675 - 250, 430);
        ctx.lineTo(620 - 250, 430);
        ctx.lineTo(620 - 250, 450);
        ctx.stroke();

        //  > connection to rs2
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.moveTo(675 - 250, 430);
        ctx.lineTo(920 - 250, 430);
        ctx.lineTo(920 - 250, 460);
        ctx.stroke();

        //  > connection to rs3
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.moveTo(675 - 250, 430);
        ctx.lineTo(1140 - 250, 430);
        ctx.lineTo(1140 - 250, 460);
        ctx.stroke();
        ctx.stroke();

        // the load operation
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            ctx.rect(250, 350 + i * 20, 50, 20);
            if (stopper === 1 || typeof rs_load[i] === 'undefined') {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(250, 350 + i * 20, 50, 20);
                ctx.fillText("R", 250 + 20, 350 + i * 20 + 15);
            } else if (typeof rs_load[i] !== 'undefined') {
                ctx.fillStyle = "#000000";
                ctx.fillText(rs_load[i].r1.value, 250 + 20, 350 + i * 20 + 15);
                ctx.fillStyle = "#751aff";
                ctx.fillRect(250, 350 + i * 20, 50, 20);
            }
            ctx.stroke();
        }

        ctx.strokeStyle = 'black';
        ctx.moveTo(275, 430);
        ctx.lineTo(275, 475);
        ctx.lineTo(210, 475);
        ctx.lineTo(210, 730);
        ctx.stroke();


        // fp regs
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            (reg[i].lock) ? ctx.fillStyle = '#ff884d': ctx.fillStyle = '#ff4d4d';
            ctx.rect(900 - 250, 40 + i * 20, 150, 20);
            ctx.fillRect(900 - 250, 40 + i * 20, 150, 20)
            ctx.fillStyle = 'rgb(0,0,0)';
            ctx.fillText("REG" + i + ' ' + reg[i].value, 900 - 240, 40 + i * 20 + 15);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'green';
        ctx.moveTo(975 - 250, 360);
        ctx.lineTo(975 - 250, 410);

        // ctx.rect(900 - 250, 380, 150, 30);

        ctx.moveTo(975 - 250, 410);
        ctx.lineTo(975 - 250, 420);

        ctx.moveTo(680 - 250, 420);
        ctx.lineTo(1280 - 250, 420);

        ctx.moveTo(680 - 250, 420);
        ctx.lineTo(680 - 250, 450);

        ctx.moveTo(1060 - 250, 420);
        ctx.lineTo(1060 - 250, 460);

        ctx.moveTo(1280 - 250, 420);
        ctx.lineTo(1280 - 250, 460);

        ctx.moveTo(1200 - 250, 420);
        ctx.lineTo(1200 - 250, 460);

        ctx.moveTo(980 - 250, 420);
        ctx.lineTo(980 - 250, 460);

        ctx.moveTo(760 - 250, 420);
        ctx.lineTo(760 - 250, 450);

        ctx.lineWidth = 3;
        ctx.stroke();

        // cache reg

        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.moveTo(200, 60);
        ctx.lineTo(200, 80);
        ctx.stroke();

        for (let i = 0; i < freg_number; i++) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            (feg[i].lock) ? ctx.fillStyle = '#ff884d': ctx.fillStyle = '#ff4d4d';
            ctx.rect(150, 80 + i * 20, 100, 20);
            ctx.fillRect(150, 80 + i * 20, 100, 20);
            ctx.font = "14px Comic Sans MS";
            ctx.fillStyle = "black";
            ctx.fillText("F" + i + " " + feg[i].value, 160, 95 + i * 20);
            ctx.stroke();
        }

        //cache unit
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'red';
        ctx.moveTo(200, 200);
        ctx.lineTo(200, 300);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(200, 300);
        ctx.strokeStyle = '#ff1ac6'
        ctx.lineTo(175, 300);
        ctx.lineTo(175, 350);
        ctx.moveTo(200, 300);
        ctx.lineTo(275, 300);
        ctx.lineTo(275, 350);
        ctx.stroke();

        //reservation station 1
        for (let i = 0; i < add_rs_number; i++) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            let dot = 0;
            if (!rs_add[i].finish) {
                dot = 1;
                console.log("Not finished ", i);
            }

            if (dot) {
                ctx.fillStyle = "#1a75ff";
                ctx.fillRect(600 - 250, 350 + 100 + i * 20, 40, 20);
                (rs_add[i].r1.lock) ? ctx.fillStyle = "#2eb8b8": ctx.fillStyle = "#1a75ff";
                ctx.fillRect(640 - 250, 350 + 100 + i * 20, 80, 20);
                (rs_add[i].r2.lock) ? ctx.fillStyle = "#2eb8b8": ctx.fillStyle = "#1a75ff";
                ctx.fillRect(720 - 250, 350 + 100 + i * 20, 80, 20);

                ctx.fillStyle = "black";
                ctx.fillText("R" + rs_add[i].pos3, 600 - 240, 350 + 115 + i * 20);
                ctx.fillText("R" + rs_add[i].pos1, 640 - 240, 350 + 115 + i * 20);
                ctx.fillText("R" + rs_add[i].pos2, 720 - 240, 350 + 115 + i * 20);

            } else {
                ctx.fillStyle = "white";
                ctx.fillRect(600 - 250, 350 + 100 + i * 20, 40, 20);
                ctx.fillText("R            ", 600 - 240, 350 + 115 + i * 20);
                ctx.fillRect(640 - 250, 350 + 100 + i * 20, 80, 20);
                ctx.fillText("R             ", 640 - 240, 350 + 115 + i * 20);
                ctx.fillRect(720 - 250, 350 + 100 + i * 20, 80, 20);
                ctx.fillText("R                ", 720 - 240, 350 + 115 + i * 20);
            }

            ctx.rect(600 - 250, 350 + 100 + i * 20, 40, 20);
            ctx.rect(640 - 250, 350 + 100 + i * 20, 80, 20);
            ctx.rect(720 - 250, 350 + 100 + i * 20, 80, 20);

            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(680 - 250, 510 + 100);
        ctx.lineTo(680 - 250, 540 + 100);

        ctx.moveTo(760 - 250, 510 + 100);
        ctx.lineTo(760 - 250, 540 + 100);
        ctx.stroke();

        //reservation station 2

        for (let i = 0; i < mult_rs_number; i++) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            let dot = 0;
            if (!rs_mult[i].finish)
                dot = 1;
            if (dot) {
                ctx.fillStyle = "#1a75ff";
                ctx.fillRect(900 - 250, 360 + 100 + i * 20, 40, 20);

                (rs_mult[i].r1.lock) ? ctx.fillStyle = "#2eb8b8": ctx.fillStyle = "#1a75ff";
                ctx.fillRect(940 - 250, 360 + 100 + i * 20, 80, 20);

                (rs_mult[i].r2.lock) ? ctx.fillStyle = "#2eb8b8": ctx.fillStyle = "#1a75ff";
                ctx.fillRect(1020 - 250, 360 + 100 + i * 20, 80, 20);

                ctx.fillStyle = "black";
                ctx.fillText("R" + rs_mult[i].pos3, 900 - 240, 360 + 115 + i * 20);
                ctx.fillText("R" + rs_mult[i].pos1, 940 - 240, 360 + 115 + i * 20);
                ctx.fillText("R" + rs_mult[i].pos2, 1020 - 240, 360 + 115 + i * 20);
            } else {
                ctx.fillStyle = "white";
                ctx.fillRect(900 - 250, 360 + 100 + i * 20, 40, 20);
                ctx.fillText("R            ", 900 - 240, 360 + 115 + i * 20);
                ctx.fillRect(940 - 250, 360 + 100 + i * 20, 80, 20);
                ctx.fillText("R             ", 940 - 240, 360 + 115 + i * 20);
                ctx.fillRect(1020 - 250, 360 + 100 + i * 20, 80, 20);
                ctx.fillText("R             ", 1020 - 240, 360 + 115 + i * 20);
            }
            ctx.rect(900 - 250, 360 + 100 + i * 20, 40, 20);
            ctx.rect(940 - 250, 360 + 100 + i * 20, 80, 20);
            ctx.rect(1020 - 250, 360 + 100 + i * 20, 80, 20);

            ctx.stroke();
        }

        ctx.beginPath();
        ctx.strokeStyle = 'black';

        ctx.moveTo(980 - 250, 420 + 100);
        ctx.lineTo(980 - 250, 620);

        ctx.moveTo(1060 - 250, 420 + 100);
        ctx.lineTo(1060 - 250, 620);

        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(50, 730);
        ctx.lineTo(1100, 730);

        ctx.moveTo(50, 730);
        ctx.lineTo(50, 300);
        ctx.moveTo(50, 300);
        ctx.lineTo(135, 300);
        ctx.moveTo(135, 300);
        ctx.lineTo(135, 350);


        ctx.moveTo(1100, 730);
        ctx.lineTo(1100, 20);
        ctx.moveTo(1100, 20);
        ctx.lineTo(725, 20); ///
        ctx.moveTo(725, 20);
        ctx.lineTo(725, 40);

        ctx.moveTo(1100, 440);
        ctx.lineTo(370, 440);

        ctx.lineWidth = 5;
        ctx.stroke();

        // the connection between the registers and reserve 3
        ctx.beginPath();
        ctx.moveTo(1200 - 250, 440 + 100);
        ctx.lineTo(1200 - 250, 500 + 100);

        ctx.moveTo(1280 - 250, 440 + 100);
        ctx.lineTo(1280 - 250, 500 + 100);

        ctx.stroke();
        //reservation station 3
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            let dot = 0;
            if (!rs_bin[i].finish)
                dot = 1;
            if (dot) {
                // console.log("this is the third reservation station ", rs_bin[i]);
                ctx.fillStyle = "#1a75ff";
                ctx.fillRect(1120 - 250, 360 + 100 + i * 20, 40, 20);
                ctx.fillStyle = (rs_bin[i].r1.lock) ? "#2eb8b8" : "#1a75ff";
                ctx.fillRect(1160 - 250, 360 + 100 + i * 20, 80, 20);
                // a condition for the second register as complement does not contain it.
                ctx.fillStyle = (rs_bin[i].r2 !== null) ? (rs_bin[i].r2.lock) ? "#2eb8b8" : "#1a75ff" : "#ffffff";
                ctx.fillRect(1240 - 250, 360 + 100 + i * 20, 80, 20);

                ctx.fillStyle = "black";
                ctx.fillText("R" + rs_bin[i].pos3, 1120 - 240, 360 + 115 + i * 20);
                ctx.fillText("R" + rs_bin[i].pos1, 1160 - 240, 360 + 115 + i * 20);
                if (rs_bin[i].r2 !== null) ctx.fillText("R" + rs_bin[i].pos2, 1240 - 240, 360 + 115 + i * 20);

            } else {
                ctx.fillStyle = "white";
                ctx.fillRect(1120 - 250, 360 + 100 + i * 20, 40, 20);
                ctx.fillText("R            ", 1120 - 240, 360 + 115 + i * 20);

                ctx.fillRect(1160 - 250, 360 + 100 + i * 20, 80, 20);
                ctx.fillText("R             ", 1160 - 240, 360 + 115 + i * 20);

                ctx.fillRect(1240 - 250, 360 + 100 + i * 20, 80, 20);
                ctx.fillText("R             ", 1240 - 240, 360 + 115 + i * 20);
            }
            ctx.rect(1120 - 250, 360 + 100 + i * 20, 40, 20);
            ctx.rect(1160 - 250, 360 + 100 + i * 20, 80, 20);
            ctx.rect(1240 - 250, 360 + 100 + i * 20, 80, 20);
            ctx.stroke();
        }



        // ------- the operations to be performed

        // the store operations
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            ctx.rect(100, 350 + i * 20, 50, 20);
            if (stopper === 1) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(100, 350 + i * 20, 50, 20);
                ctx.fillText("  ", 100 + 20, 350 + i * 20 + 15);
            } else if (typeof rs_store[i] !== 'undefined') {
                ctx.fillStyle = "#000000";
                ctx.fillText("F" + (test[rs_store[i].ip].reg1[1]), 100 + 20, 350 + i * 20 + 15);
                ctx.fillStyle = "#751aff";
                ctx.fillRect(100, 350 + i * 20, 50, 20);
            }
            ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            ctx.rect(150, 350 + i * 20, 50, 20);
            if (stopper === 1) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(150, 350 + i * 20, 50, 20);
                ctx.fillText("   ", 100 + 20, 350 + i * 20 + 15);
            } else if (typeof rs_store[i] !== 'undefined') {
                ctx.fillStyle = "#000000";
                ctx.fillText(rs_store[i].r.value, 100 + 20, 350 + i * 20 + 15);
                ctx.fillStyle = "#751aff";
                ctx.fillRect(100, 350 + i * 20, 50, 20);
            }
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.moveTo(150, 430);
        ctx.lineTo(150, 475);
        ctx.lineTo(210, 475);
        ctx.stroke();

        // in case of store
        for (let i = 0; i < rs_store.length; i++) {
            if (typeof rs_store[i] !== 'undefined') {
                if (rs_store[i].time + store_t === clk && !rs_store[i].check()) {
                    rs_store[i].f.value = int16(rs_store[i].r.value);
                    rs_store[i].f.lock = false;
                    test[rs_store[i].ip].write_time = clk;
                    test[rs_store[i].ip].finished = true;
                    mod_release(rs_store, i);
                }
            }
        }

        // load operation 
        for (let i = 0; i < rs_load.length; i++) {
            if (typeof rs_load[i] !== 'undefined') {
                if (rs_load[i].time + load_t === clk && !rs_load[i].check()) {
                    rs_load[i].r1.value = rs_load[i].f1.value;
                    if (rs_load[i].value !== 0) {
                        if (rs_load[i].additional_condition === '+')
                            rs_load[i].r1.value += rs_load[i].value;
                        else if (rs_load[i].additional_condition === '-')
                            rs_load[i].r1.value -= rs_load[i].value;
                        else if (rs_load[i].additional_condition === '*')
                            rs_load[i].r1.value *= rs_load[i].value;
                        console.log("appt", rs_load[i].r1.value);
                    }
                    reg[rs_load[i].pos1].lock = false;
                    test[rs_load[i].ip].write_time = clk;
                    test[rs_load[i].ip].finished = true;
                    mod_release(rs_load, i);
                }
            }
        }


        //addition
        ctx.beginPath()

        for (let i = 0; i < add_mod_number; i++) {
            ctx.fillStyle = (typeof mod_adder[i] !== 'undefined' && stopper < 1) ? ((i % 2 == 0) ? '#009933' : '#00cc99') : ((i % 2 == 0) ? 'grey' : 'black');
            ctx.fillRect(620 - 250 + i * 30, 540 + 100 + i * 10, 150, 30);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.moveTo(535, 600 + 100);
        ctx.lineTo(535, 630 + 100);
        ctx.stroke();
        // the addition and addition like module
        console.log("the length of the add moder ", mod_adder.length);
        for (let i = 0; i < add_mod_number; i++) {
            if (typeof mod_adder[i] !== 'undefined') {
                if (mod_adder[i].time + add_t === clk) {
                    console.log("at ", i, ' ', mod_adder[i]);
                    let t_index = mod_adder[i].tag;
                    let reg_index = (test[t_index].dst.length === 2) ? [parseInt(test[t_index].dst[1])] : [parseInt(test[t_index].dst[1] + test[t_index].dst[2])]
                    if (test[mod_adder[i].tag].operation === "ADC")
                        reg[reg_index].value = mod_adder[i].addition();
                    else if (test[mod_adder[i].tag].operation === "SUB")
                        reg[reg_index].value = mod_adder[i].subtraction();
                    else if (test[mod_adder[i].tag].operation === "ADD")
                        reg[reg_index].value = mod_adder[i].addition_without_carry();
                    reg[reg_index].lock = false;
                    test[mod_adder[i].tag].write_time = clk;
                    test[mod_adder[i].tag].finished = true;
                    mod_release(mod_adder, i);
                }
            }
        }


        //multiplication
        ctx.beginPath();

        for (let i = 0; i < mult_mod_number; i++) {
            ctx.fillStyle = (typeof mod_mult[i] !== 'undefined' && stopper < 1) ? ((i % 2 == 0) ? '#009933' : '#00cc99') : ((i % 2 == 0) ? 'grey' : 'black');
            ctx.fillRect(940 - 250 + i * 30, 520 + 100 + i * 10, 150, 30);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.moveTo(1075 - 250, 570 + 100);
        ctx.lineTo(1075 - 250, 630 + 100);
        ctx.stroke();
        // the multiplication module
        for (let i = 0; i < mult_mod_number; i++) {
            if (typeof mod_mult[i] !== 'undefined') {
                if (mod_mult[i].time + mult_t === clk) {
                    let t_index = mod_adder[i].tag;
                    let reg_index = (test[t_index].dst.length === 2) ? [parseInt(test[t_index].dst[1])] : [parseInt(test[t_index].dst[1] + test[t_index].dst[2])]
                    reg[reg_index].value = mod_mult[i].multiplication();
                    reg[reg_index].lock = false;
                    test[mod_mult[i].tag].write_time = clk;
                    test[mod_mult[i].tag].finished = true;
                    mod_release(mod_mult, i);
                }
            }
        }


        //binary operations 
        ctx.beginPath();
        for (let i = 0; i < bin_mod_number; i++) {
            ctx.fillStyle = (typeof mod_bin[i] !== 'undefined' && stopper < 1) ? ((i % 2 == 0) ? '#009933' : '#00cc99') : ((i % 2 == 0) ? 'grey' : 'black');
            ctx.fillRect(1150 - 250 + i * 10, 500 + 100 + i * 10, 150, 30);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.moveTo(1265 - 250, 570 + 100);
        ctx.lineTo(1265 - 250, 630 + 100);
        ctx.stroke();
        // the binary operations module
        for (let i = 0; i < bin_mod_number; i++) {
            if (typeof mod_bin[i] !== 'undefined') {
                if (mod_bin[i].time + bin_t === clk) {
                    if (test[mod_bin[i].tag].operation === "CMP")
                        reg[mod_bin[i].dst].value = mod_bin[i].complement();
                    else if (test[mod_bin[i].tag].operation === "XOR")
                        reg[mod_bin[i].dst].value = mod_bin[i].xor();
                    else if (test[mod_bin[i].tag].operation === "NAND")
                        reg[mod_bin[i].dst].value = mod_bin[i].nand();
                    else if (test[mod_bin[i].tag].operation === "LHR")
                        reg[mod_bin[i].dst].value = mod_bin[i].lshift();
                    else if (test[mod_bin[i].tag].operation === "SHR")
                        reg[mod_bin[i].dst].value = mod_bin[i].rshift();
                    reg[mod_bin[i].dst].lock = false;
                    test[mod_bin[i].tag].write_time = clk;
                    test[mod_bin[i].tag].finished = true;
                    mod_release(mod_bin, i);
                }
            }
        }



        // ------------- check where the next instruction should go to 
        // in case of load store operation 


        //in case of going to an adder 
        for (let i = 0; i < add_rs_number; i++) {
            if (rs_add[i].finish === false) {
                var blank = check_full(mod_adder, add_mod_number);
                if (!rs_add[i].check() && blank !== -1) {
                    rs_add[i].finish = true;
                    test[rs_add[i].ip].exe_time = clk;
                    mod_adder[blank] = new add_mod(int16(rs_add[i].r1.value), int16(rs_add[i].r2.value), int16(rs_add[i].dst.value), clk, rs_add[i].ip);
                    rs_add[i] = new add_rs();
                }
            }
        }

        //in case of multiplication 
        for (let i = 0; i < mult_rs_number; i++) {
            if (rs_mult[i].finish === false) {
                var blank = check_full(mod_mult, mult_mod_number);
                if (!rs_mult[i].check() && blank !== -1) {
                    // console.log("THE BLANK VALUE ", blank);
                    // console.log("Dispatch to the alu at time ", clk);
                    rs_mult[i].finish = true;
                    test[rs_mult[i].ip].exe_time = clk;
                    mod_mult[blank] = new mult_mod(int16(rs_mult[i].r1.value), int16(rs_mult[i].r2.value), int16(rs_mult[i].dst.value), clk, rs_mult[i].ip);
                    rs_mult[i] = new mult_rs();
                }
            }
        }


        //in case of binary operations
        for (let i = 0; i < bin_rs_number; i++) {
            if (rs_bin[i].finish === false) {
                var blank = check_full(mod_bin, bin_mod_number);
                if (!rs_bin[i].check() && blank !== -1) {
                    rs_bin[i].finish = true;
                    test[rs_bin[i].ip].exe_time = clk;
                    if (test[rs_bin[i].ip].operation === "CMP")
                        mod_bin[blank] = new bin_mod(int16(rs_bin[i].r1.value), int16(rs_bin[i].dst.value), clk, rs_bin[i].ip);
                    else
                        mod_bin[blank] = new bin_mod(int16(rs_bin[i].r1.value), int16(rs_bin[i].dst.value), clk, rs_bin[i].ip, int16(rs_bin[i].r2.value));
                    rs_bin[i] = new bin_rs();
                }
            }
        }





        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.font = "10px Arial";

        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            if (i < test.length) {
                (test[i].rs_tag !== -1) ? ctx.fillStyle = 'rgb(0,255,0)': ctx.fillStyle = 'rgb(255,0,0)';
                ctx.rect(600 - 250, 210 - i * 20, 150, 20);
                ctx.fillRect(600 - 250, 210 - i * 20, 150, 20);
                ctx.fillStyle = 'rgb(0,0,0)';
                ctx.fillText(test[i].operation + ' ' + test[i].reg1, 600 - 240, 210 - i * 20 + 15);
            }
            ctx.stroke();
        }

        var t_index = 0;
        for (let j = 0; j < test.length; j++) {
            // console.log("the test ", j, " ", test[j].operation,' ',reg[parseInt(test[j].dst)]);
            if (test[j].operation === "LOAD" && test[j].finished === false && test[j].rs_tag === -1 && reg[parseInt(test[j].dst[1])].lock === false) {
                let i = check_full(rs_load, load_rs_number);
                if (i !== -1) {
                    rs_load.push(new load_rs());
                    if (rs_load[i].finish === true) {
                        console.log("My name is load")
                        rs_load[i].finish = false;
                        rs_load[i].pos1 = (test[j].dst.length === 2) ? parseInt(test[j].dst[1]) : parseInt(test[j].dst[1] + test[j].dst[2]);
                        rs_load[i].pos2 = parseInt(test[j].reg1[1]);
                        rs_load[i].r1 = reg[rs_load[i].pos1];
                        rs_load[i].f1 = feg[rs_load[i].pos2];
                        rs_load[i].value = int16(parseInt(test[j].reg2));
                        rs_load[i].additional_condition = test[j].additional_condition;
                        rs_load[i].ip = j;
                        test[j].rs_tag = i;
                        test[j].issue_time = clk;
                        rs_load[i].time = clk;
                        reg[rs_load[i].pos1].lock = true;
                        // rs_load[i].f1.lock = true;
                        i = i + load_rs_number;
                    }
                }
            } else if (test[j].operation === "STR" && test[j].finished === false && test[j].rs_tag === -1 && reg[parseInt(test[j].dst[1])].lock === false) {
                let i = check_full(rs_store, store_rs_number);
                if (i !== -1) {
                    rs_store.push(new store_rs());
                    if (rs_store[i].finish === true) {
                        // console.log("this is store")
                        rs_store[i].finish = false;
                        rs_store[i].r = (test[j].dst.length === 2) ? reg[parseInt(test[j].dst[1])] : reg[parseInt(test[j].dst[1] + test[j].dst[2])];
                        rs_store[i].f = feg[parseInt(test[j].reg1[1])];
                        // rs_store[i].value = parseInt(test[j].reg2);
                        // rs_store[i].additional_condition = test[j].additional_condition;
                        rs_store[i].ip = j;
                        test[j].rs_tag = i;
                        test[j].issue_time = clk;
                        rs_store[i].time = clk;
                        rs_store[i].f.lock = true;
                        // rs_load[i].f1.lock = true;
                        i = i + store_rs_number;
                    }
                }
            } else if ((test[j].operation === "ADC" || test[j].operation === "SUB" || test[j].operation === "ADD") && test[j].finished === false && test[j].rs_tag === -1) {
                t_index = j;
                for (let i = 0; i < add_rs_number; i++) {
                    if (rs_add[i].finish === true) {
                        console.log("we have been alloted a reservation station at ", clk);
                        rs_add[i].finish = false;
                        rs_add[i].pos1 = (test[t_index].reg1.length === 2) ? parseInt(test[t_index].reg1[1]) : parseInt(test[t_index].reg1[1] + test[t_index].reg1[2]);
                        rs_add[i].pos2 = (test[t_index].reg2.length === 2) ? parseInt(test[t_index].reg2[1]) : parseInt(test[t_index].reg2[1] + test[t_index].reg2[2]);
                        rs_add[i].pos3 = (test[t_index].dst.length === 2) ? parseInt(test[t_index].dst[1]) : parseInt(test[t_index].dst[1] + test[t_index].dst[2]);
                        rs_add[i].r1 = reg[rs_add[i].pos1]
                        rs_add[i].r2 = reg[rs_add[i].pos2]
                        rs_add[i].dst = reg[rs_add[i].pos3]
                        rs_add[i].ip = t_index;
                        test[t_index].rs_tag = i;
                        test[t_index].issue_time = clk;
                        rs_add[i].dst.lock = true;
                        console.log(rs_add[i]);
                        i = i + add_rs_number; // to not check other reservation stations
                    }
                }
            } else if (test[j].operation === "MULT" && test[j].finished === false && test[j].rs_tag === -1) {
                t_index = j;
                for (let i = 0; i < mult_rs_number; i++) {
                    if (rs_mult[i].finish === true) {
                        rs_mult[i].finish = false;
                        rs_mult[i].pos1 = (test[t_index].reg1.length === 2) ? parseInt(test[t_index].reg1[1]) : parseInt(test[t_index].reg1[1] + test[t_index].reg1[2]);
                        rs_mult[i].pos2 = (test[t_index].reg2.length === 2) ? parseInt(test[t_index].reg2[1]) : parseInt(test[t_index].reg2[1] + test[t_index].reg2[2]);
                        rs_mult[i].pos3 = (test[t_index].dst.length === 2) ? parseInt(test[t_index].dst[1]) : parseInt(test[t_index].dst[1] + test[t_index].dst[2]);
                        rs_mult[i].r1 = rs_mult[i].pos1;
                        rs_mult[i].r2 = rs_mult[i].pos2;
                        rs_mult[i].dst = rs_mult[i].pos3;
                        rs_mult[i].ip = t_index;
                        test[t_index].rs_tag = i;
                        test[t_index].issue_time = clk;
                        rs_mult[i].dst.lock = true;
                        // console.log(rs_mult[i]);
                        i = i + mult_rs_number; // to not check other reservation stations
                    }
                }
            } else if ((test[j].operation === "CMP" || test[j].operation === "XOR" || test[j].operation === "NAND" || test[j].operation === "LHR" || test[j].operation === "SHR") && test[j].finished === false && test[j].rs_tag === -1) {
                t_index = j;
                for (let i = 0; i < bin_rs_number; i++) {
                    if (rs_bin[i].finish === true) {
                        // console.log("we have been alloted a reservation station at ", clk);
                        rs_bin[i].finish = false;
                        rs_bin[i].pos1 = (test[t_index].reg1.length === 2) ? parseInt(test[t_index].reg1[1]) : parseInt(test[t_index].reg1[1] + test[t_index].reg1[2]);
                        rs_bin[i].pos2 = (test[j].operation !== "CMP") ? (test[t_index].reg2.length === 2) ? parseInt(test[t_index].reg2[1]) : parseInt(test[t_index].reg2[1] + test[t_index].reg2[2]) : null;
                        rs_bin[i].pos3 = (test[t_index].dst.length === 2) ? parseInt(test[t_index].dst[1]) : parseInt(test[t_index].dst[1] + test[t_index].dst[2]);

                        rs_bin[i].r1 = rs_bin[i].pos1;
                        rs_bin[i].r2 = (test[j].operation !== "CMP") ? reg[rs_bin[i].pos2] : null;
                        rs_bin[i].dst = rs_bin[i].pos3;

                        rs_bin[i].ip = t_index;
                        test[t_index].rs_tag = i;
                        test[t_index].issue_time = clk;
                        rs_bin[i].dst.lock = true;
                        // console.log(rs_bin[i]);
                        i = i + bin_rs_number; // to not check other reservation stations
                    }
                }
            }
        }


        // termination check
        for (let i = 0; i < test.length; i++) {
            incomplete = false;
            // console.log("terminate at ", i, " ", test[i].finished);
            if (test[i].finished === false) {
                incomplete = true;
                break;
            }
        }

        for (let i = 0; i < 5; i++) {
            console.log("terminationstatus at ", reg[i].lock, " of ", i);
        }

        // for (let i = 0; i < test.length; i++) {
        //     console.log("terminationstatus at ", test[i].operation, " ", test[i].finished);
        // }

        // termination 

        if (stopper === 1) {
            green_table();
            clearInterval(interval);
        }

        if (!incomplete) {
            for (let i = 0; i < reg.length; i++) {
                // console.log("the value of reigister ", i, " is ", reg[i].value, " is ", reg[i].lock);
            }
            stopper++;
        }

        console.log("the clock ", clk);
        clk = clk + 1;

        if (clk === 18)
            clearInterval(interval);
    }
    // end of working

    function green_table() {

        for (let i = 0; i < test.length; i++) {
            document.getElementById('inst' + i).innerHTML = test[i].tagline;
            document.getElementById('ist' + i).innerHTML = test[i].issue_time + 1;
            document.getElementById('wbt' + i).innerHTML = test[i].exe_time + 1;
            document.getElementById('ext' + i).innerHTML = test[i].write_time + 1;
        }
    }

});