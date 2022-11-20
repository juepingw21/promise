// let p = new Promise((resolve, reject) => {
//     resolve("first");
// }).then(
//     value => {
//         console.log(value);
//         return new Promise((resolve, reject) => {
//             reject("second");
//         })
//     }
// ).then(
//     value => {
//         console.log("success", value);
//     },
//     reason => {
//         console.log("rejected", reason);
//     }
// )

let p1 = new Promise((resolve, reject) => {
    resolve("1");
});

let p2 = new Promise((resolve, reject) => {
    reject("2");
});

Promise.all([p1, p2]).then(
    value =>{
        console.log("value", value);
    },
    reason => {
        console.log("reason", reason);
    }
)



// Promise.resolve(p).then(
//     (v) => {
//         console.log("v",v);
//     },
//     (e) => {
//         console.log("e", e);
//     }
// );

// console.log("hello");