class CPromise {
    /**
     * There are three states for a CPromise ojbect:
     * pending: initial state, neither fulfilled nor rejected.
     * fulfilled: meaning that the operation was completed successfully.
     * rejected: meaning that the operation failed.
     */
    static PENDING = "pending";
    static FULFILLED = "fulfilled";
    static REJECT = "reject";

    /**
     * Initializes a CPromise ojbect by passing an executor function. There are three states 
     * for a CPromise ojbect.
     *
     * @param {function} executor - calls resolve if it was successful or reject if there was an error.
     */
    constructor(executor) {
        this.status = CPromise.PENDING;
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
     * The resolve() method "resolves" a given value to a Promise. 
     * If the value is a promise, that promise is returned; if the value 
     * is a thenable, Promise.resolve() will call the then() method with 
     * two callbacks it prepared; otherwise the returned promise will be 
     * fulfilled with the value.
     * 
     * @param {*} value 
     * @returns - a new promise object
     */
    static resolve(value) {
        return new CPromise((resolve, reject) => {
            if (value instanceof CPromise) {
                value.then(resolve, reject);
            } else {
                resolve(value);
            }
        });
    }

    /**
     * The Promise.reject() method returns a Promise object that is rejected 
     * with a given reason.
     * 
     * @param {*} value 
     * @returns - a new promise object
     */
    static reject(value) {
        return new CPromise((resolve, reject) => {
            reject(value);
        });
    }

    /**
     * The all() method takes promises as input and returns a single Promise. 
     * This returned promise fulfills when all of the input's promises fulfill 
     * (including when an empty iterable is passed), with an array of the fulfillment 
     * values. It rejects when any of the input's promises rejects, with this first 
     * rejection reason.
     * 
     * @param {*} promises - a list of promises
     * @returns - a new promise object
     */
    static all(promises) {
        return new CPromise((resolve, reject) => {
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

    /**
     * The Promise.race() method takes an iterable of promises as input and returns a 
     * single Promise. This returned promise settles with the eventual state of the 
     * first promise that settles.
     * 
     * @param {*} promises - a list of promises
     * @returns - a new promise object
     */
    static race(promises) {
        return new CPromise((resolve, reject) => {
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
    /**
     * Changes the state — initially "pending" to "fulfilled". Promise state only can
     * be changed once from "pending" by either calling resolve() or reject(). For 
     * example, calling resolve() after reject() does not rechange the state.  
     *
     * @param {*} value  - fulfilled message
     */
    resolve(value) {
        // Promise state only can be changed once
        if (this.status == CPromise.PENDING) {
            this.status = CPromise.FULFILLED;
            this.value = value;

            /**
             * If the resolve() is placed to event queue by other async functions, statements 
             * from then() cannot be executed immediately after resolve(). All the statements 
             * from then() are stored in callbacks queue beacuse they must wait until resolve() 
             * is called.
             * 
             * Statments before or above resolve() run synchronously, and they must yield 
             * resolve(). The setTimeout() forces statements from then() to execute after 
             * resolve().
             *
             * For example:
             *    let p = new Promise((resolve, reject)=>{
             *         console.log("before setTimeout")
             *         setTimeout(()=>{
             *             resolve("wait for 5 seconds");
             *             console.log("statements after the resolve()")
             *         }, 5000);
             *         console.log("after setTimeout")
             *    }).then(value => console.log(value));
             * console.log("hello")
             *
             * Output:
             * before setTimeout
             * after setTimeout
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
        if (this.status == CPromise.PENDING) {
            this.status = CPromise.REJECT;
            this.value = reason;

            // The ideas are same as resolve(). 
            setTimeout(() => {
                this.callbacks.map((callback) => {
                    callback.onRejected(reason);
                });
            });
        }
    }

    /**
     * Parse the returned promise by user and init a new promise.
     * 
     * case 1: result is a promise object
     *  If the result is resolved, sets the value to the new promise and the status to resolved.
     *  If the result is rejected, sets the value to the new promise and the status to rejected.
     * 
     * case 2: result is NOT a promise object
     *  Sets the value to the new promise and the status to resolved.
     *  
     * @param {*} promise - new promise
     * @param {*} result - returned promise by user from then() function
     * @param {*} resolve - resolve function from the new promise
     * @param {*} reject - reject function from the new promise
     */
    parse(promise, result, resolve, reject) {
        // Chaining cycle detected
        if (promise == result) {
            throw new TypeError("Chaining cycle detected");
        }
        try {
            // then() function returns a promise object
            if (result instanceof CPromise) {
                // onFulfilled(value), onRejected(reason)
                result.then(resolve, reject);
                // then() function returns a promise object 
            } else {
                resolve(result);
            }
        } catch (error) {
            reject(error);
        }
    }

    /**
     * The then() method returns a Promise. It takes up to two arguments: callback
     * functions for the fulfilled and rejected cases of the Promise.
     * 
     * @param {*} onFulfilled - callback function for the fulfilled
     * @param {*} onRejected - callback function for the rejected
     * @returns - a new object promise
     */
    then(onFulfilled, onRejected) {

        // Allows to omit onFulfilled function when reject() was called.
        // Allows to omit passing value: 
        // Promise.resolve("success").then().then(v => console.log(v))
        if (typeof onFulfilled !== "function") {
            onFulfilled = () => this.value;
        }

        // Allows to omit onRejected function when resolve() was called.
        // Allows to omit passing value: 
        //  Promise.reject("failed").then().then(null, e => console.log(e))
        if (typeof onRejected !== "function") {
            onRejected = () => this.value;
        }

        let promise = new CPromise((resolve, reject) => {

            // Promise state is FULFILLED. Executes onFulfilled(value) if there is no 
            // error in onFulfilled(value). Otherwise, executes onRejected(error);
            if (this.status == CPromise.FULFILLED) {
                // Simulate the event queue. Let the main thread run first
                setTimeout(() => {
                    let result = onFulfilled(this.value);
                    this.parse(promise, result, resolve, reject);
                });
            }

            // Promise state is REJECT. Executes onRejected(value) if there is no error in
            // onRejected(value). Otherwise, executes onRejected(error);
            if (this.status == CPromise.REJECT) {
                // Simulate the event queue. Let the main thread run first
                setTimeout(() => {
                    let result = onRejected(this.value);
                    this.parse(promise, result, resolve, reject);
                });
            }

            // Promise state is CPromise.PENDING. If reslove() or reject() are placed in the event queue,
            // statements in then() need to wait for reslove() or reject() to be called. We put statements 
            // in then() into a callback queue
            if (this.status == CPromise.PENDING) {
                this.callbacks.push({
                    onFulfilled: (value) => {
                        let result = onFulfilled(value);
                        this.parse(promise, result, resolve, reject);
                    },
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