class HD {
    /**
     * There are three states for a HD ojbect:
     * pending: initial state, neither fulfilled nor rejected.
     * fulfilled: meaning that the operation was completed successfully.
     * rejected: meaning that the operation failed.
     */
    static PENDING = "pending";
    static FULFILLED = "fulfilled";
    static REJECT = "reject";

    /**
     * Initializes a HD ojbect by passing an executor function. There are three states 
     * for a HD ojbect.
     *
     * @param {function} executor - calls resolve if it was successful or reject if there was an error.
     */
    constructor(executor) {
        this.status = HD.PENDING;
        this.value = null;
        this.callbacks = [];

        /*
         * catch errors from the function: (resolve, reject) => { }
         *
         * For example:
         *      let p = new Promise((resolve, reject) => resolve(fun));
         *      Uncaught (in promise) ReferenceError: fun is not defined
         */
        try {
            /*
             * When resolve() is called in arrow function, this keyword
             * points to Window object.
             *
             * For example:
             *  let p = new Promise((resolve, reject) => resolve(fun));
             *
             * The keyword this in resolve() points to the Window.
             */
            executor(this.resolve.bind(this), this.reject.bind(this));
        } catch (error) {
            this.reject(error);
        }
    }

    /**
     * Changes the state — initially "pending" to "fulfilled". Promise state only can
     * be changed once from "pending" by either calling resolve() or reject(). For 
     * example, calling resolve() after reject() does not rechange the state.  
     *
     * @param {*} value  - fulfilled message
     */
    resolve(value) {
        // Promise state only can be changed once
        if (this.status == HD.PENDING) {
            this.status = HD.FULFILLED;
            this.value = value;
            
            /**
             * Statments before or above resolve() run synchronously, and they must yield 
             * resolve(). The setTimeout() forces statements from then() to execute after 
             * resolve().
             * 
             * For example:
             * 
             * let p = new Promise((resolve, reject)=>{
             *         console.log("1111")
             *         resolve("3333");
             *         console.log("2222")
             *    }).then(value => console.log(value));
             * 
             * Output:
             * 1111
             * 2222
             * 3333
             * 
             * If the resolve() is placed to event queue by other async functions, statements 
             * from then() cannot be executed immediately after resolve(). All the statements 
             * from then() are stored in callbacks queue beacuse they must wait until resolve() 
             * is called.
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
                    callback.onFulfilled(value);
                });
            });
        }
    }

    /**
     * Changes the state — initially "pending" to "reject". Promise state only can
     * be changed once from "pending" by either calling resolve() or reject(). For 
     * example, calling reject() after resolve() does not rechange the state.  
     *
     * @param {*} value  - fulfilled message
     */
    reject(reason) {
        if (this.status == HD.PENDING) {
            this.status = HD.REJECT;
            this.value = reason;

            // The ideas are same as resolve(). 
            setTimeout(() => {
                this.callbacks.map((callback) => {
                    callback.onRejected(reason);
                });
            });
        }
    }

    parse(promise, result, resolve, reject) {
        if (promise == result) {
            throw new TypeError("Chaining cycle detected");
        }
        try {
            if (result instanceof HD) {
                result.then(
                    (value) => {
                        resolve(value);
                    },
                    (reason) => {
                        reject(reason);
                    }
                );
            } else {
                resolve(result);
            }
        } catch (error) {
            reject(error);
        }
    }

    static resolve(value) {
        return new HD((resolve, reject) => {
            if (value instanceof HD) {
                value.then(
                    (v) => {
                        resolve(v);
                    },
                    (e) => {
                        reject(e);
                    }
                );
            } else {
                resolve(value);
            }
        });
    }

    static reject(value) {
        return new HD((resolve, reject) => {
            reject(value);
        });
    }

    static all(promises) {
        return new HD((resolve, reject) => {
            const resloves = [];
            for (let i = 0; i < promises.length; i++) {
                promises[i].then(
                    (value) => {
                        resloves.push(value);
                        if (resloves.length == promises.length) {
                            resolve(resloves);
                        }
                    },
                    (reason) => {
                        reject(reason);
                    }
                );
            }
        });
    }

    static race(promises) {
        return new HD((resolve, reject) => {
            for (let i = 0; i < promises.length; i++) {
                promises[i].then(
                    (value) => {
                        resolve(value);
                    },
                    (reason) => {
                        reject(reason);
                    }
                );
            }
        });
    }

    then(onFulfilled, onRejected) {
        /**
         * Allows to omit onRejected function when resolve() was called.
         */
        if (typeof onRejected !== "function") {
            onRejected = () => this.value;
        }

        /**
         * Allows to omit onFulfilled function when reject() was called.
         */
        if (typeof onFulfilled !== "function") {
            onFulfilled = () => this.value;
        }

        let promise = new HD((resolve, reject) => {
            /**
             * Promise state is FULFILLED.
             *
             * Executes onFulfilled(value) if there is no error in onFulfilled(value).
             * Otherwise, executes onRejected(error);
             */
            if (this.status == HD.FULFILLED) {
                // Simulate the event queue. Let the main thread run first
                setTimeout(() => {
                    let result = onFulfilled(this.value);
                    this.parse(promise, result, resolve, reject);
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
                    let result = onRejected(this.value);
                    this.parse(promise, result, resolve, reject);
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
                        let result = onFulfilled(value);
                        this.parse(promise, result, resolve, reject);
                    },

                    /**
                     * Executes onRejected(value) if there is no error in onRejected(value).
                     * Otherwise, executes onRejected(error);
                     *
                     * @param {*} value the value from reject(value)
                     */
                    onRejected: (value) => {
                        let result = onRejected(value);
                        this.parse(promise, result, resolve, reject);
                    },
                });
            }
        });

        return promise;
    }
}
