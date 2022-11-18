class HD {
    static PENDING = "pending";
    static FULFILLED = "fulfilled";
    static REJECT = "reject";

    constructor(executor) {
        this.status = HD.PENDING;
        this.value = null;
        this.callbacks = [];

        /**
         * catch errors from the function: (resolve, reject) => { }
         *
         * For example:
         *      let p = new Promise((resolve, reject) => resolve(fun));
         *      Uncaught (in promise) ReferenceError: fun is not defined
         */
        try {
            /**
             * When resolve() is called in arrow function, this keyword
             * points to Window object.
             *
             * For example:
             *  let p = new Promise((resolve, reject) => resolve(fun));
             *
             * The keyword this in resolve() points to the Window.
             *
             */
            executor(this.resolve.bind(this), this.reject.bind(this));
        } catch (error) {
            this.reject(error);
        }
    }

    resolve(value) {
        if (this.status == HD.PENDING) {
            this.status = HD.FULFILLED;
            this.value = value;

            /**
             * If the resolve() called is placed to event queue, we need to run statements in then().
             * Also, the statements in then() need to yeid the statements after the resolve()
             *
             * For example:
             *    let p = new Promise((resolve, reject)=>{
             *         console.log("before setTimeout")
             *         setTimeout(()=>{
             *             resolve("wait for 5 seconds");
             *              console.log("statements after the resolve()")
             *         }, 5000);
             *         console.log("before setTimeout")
             *    }).then(value => console.log(value));
             * console.log("hello")
             *
             * Output:
             * before setTimeout
             * before setTimeout
             * hello
             * statements after the resolve()
             * wait for 5 seconds
             */
            setTimeout(() => {
                this.callbacks.map((callback) => {
                    callback.resolve(value);
                });
            });
        }
    }

    reject(reason) {
        if (this.status == HD.PENDING) {
            this.status = HD.REJECT;
            this.value = reason;

            /**
             * If the reject() called is placed to event queue, we need to run statements in then()
             * Also, the statements in then() need to yeid the statements after the reject()
             * More information: see function resolve()
             */
            setTimeout(() => {
                this.callbacks.map((callback) => {
                    callback.onRejected(reason);
                });
            });
        }
    }

    then(onFulfilled, onRejected) {
        /**
         * Allows to omit onRejected function when resolve() was called.
         */
        if (typeof onRejected !== "function") {
            onRejected = () => {};
        }

        /**
         * Allows to omit onFulfilled function when reject() was called.
         */
        if (typeof onFulfilled !== "function") {
            onFulfilled = () => {};
        }

        /**
         * Promise state is FULFILLED.
         *
         * Executes onFulfilled(value) if there is no error in onFulfilled(value).
         * Otherwise, executes onRejected(error);
         */
        if (this.status == HD.FULFILLED) {
            // Simulate the event queue. Let the main thread run first
            setTimeout(() => {
                try {
                    onFulfilled(this.value);
                } catch (error) {
                    onRejected(error);
                }
            });
        }

        /**
         * Promise state is REJECT.
         *
         * Executes onRejected(value) if there is no error in onRejected(value).
         * Otherwise, executes onRejected(error);
         *
         */
        if (this.status == HD.REJECT) {
            // Simulate the event queue. Let the main thread run first
            setTimeout(() => {
                try {
                    onRejected(this.value);
                } catch (error) {
                    onRejected(error);
                }
            });
        }

        /**
         * Promise state is HD.PENDING
         *
         * If reslove() or reject() are placed in the event queue, statements in then() need to wait
         * for reslove() or reject() to be called.
         *
         * We put statements in then() into a callback queue
         *
         */
        if (this.status == HD.PENDING) {
            this.callbacks.push({
                /**
                 * Executes onFulfilled(value) if there is no error in onFulfilled(value).
                 * Otherwise, executes onRejected(error);
                 *
                 * @param {*} value the value from reslove(value)
                 */
                onFulfilled: (value) => {
                    try {
                        console.log("object");
                        onFulfilled(value);
                    } catch (error) {
                        onRejected(error);
                    }
                },

                /**
                 * Executes onRejected(value) if there is no error in onRejected(value).
                 * Otherwise, executes onRejected(error);
                 *
                 * @param {*} value the value from reject(value)
                 */
                onRejected: (value) => {
                    try {
                        onRejected(value);
                    } catch (error) {
                        onRejected(error);
                    }
                },
            });
            return this;
        }
    }
}

let p = new Promise((resolve, reject) => {
    console.log("before setTimeout");
    setTimeout(() => {
        resolve("wait for 5 seconds");
        console.log("statements after the resolve()");
    }, 5000);
    console.log("before setTimeout");
}).then((value) => console.log(value));
console.log("hello");
