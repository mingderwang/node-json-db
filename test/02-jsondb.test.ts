import {DatabaseError, DataError} from "../src/lib/Errors"
import {JsonDB} from "../src/JsonDB"
import * as fs from 'fs'

const testFile1 = "test/test_file1"
const testFile2 = "test/dirCreation/test_file2"
const faulty = "test/faulty.json"
const testFile3 = "test/test_file3"
const testFile4 = "test/array_file"
const testFile5 = "test/test_file_empty"
const testFile6 = "test/test_delete"

describe('JsonDB', () => {
    describe('Exception/Error', () => {
        test('should create create a DataError', () => {
            const error = new DataError("Test", 5)
            expect(error).toHaveProperty("message", "Test")
            expect(error).toHaveProperty("id", 5)
            expect(error).toHaveProperty("inner", undefined)
            expect(error.toString()).toEqual("DataError: Test")
        })

        test('should create create a DatabaseError', () => {
            const nested = new Error("don't work")
            const error = new DatabaseError("Test", 5, nested)
            expect(error).toHaveProperty("message", "Test")
            expect(error).toHaveProperty("id", 5)
            expect(error).toHaveProperty("inner", nested)
            expect(error.toString()).toEqual("DatabaseError: Test:\nError: don't work")
        })

    })
    describe('Initialisation', () => {
        let db = new JsonDB(testFile1, true, true)

        test('should create the JSON File', done => {
            fs.access(testFile1 + ".json", fs.constants.R_OK, function (err) {
                expect(err).toBeNull()
                done()
            })

        })

        test('should create the JSON File when called directly', done => {
            const jsondb = new JsonDB(testFile5, true, false)
            fs.access(testFile5 + ".json", fs.constants.R_OK, function (err) {
                expect(err).toBeNull()
                done()
            })

        })

        test('should set en empty root', () => {
            expect(JSON.stringify(db.getData("/"))).toEqual("{}")
        })

        test('should return a DatabaseError when loading faulty file', () => {
            db = new JsonDB(faulty, true)

            try {
                (function (args) {
                    db.getData(args)
                })('/')

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseError)
            }
        })
        test(
            'should return a DatabaseError when saving without successful loading.',
            () => {
                try {
                    db.save()
                    throw Error('Function did not throw')
                } catch (e) {
                    expect(e).toBeInstanceOf(DatabaseError)
                }
            }
        )

    })
    describe('Data Management', () => {

        let db = new JsonDB(testFile2, true)

        test('should store the data at the root', () => {
            const object = {test: {test: "test"}}
            db.push("/", object)
            expect(db.getData("/")).toBe(object)
        })
        test('should override the data at the root', () => {
            const object = {test: "test"}
            db.push("/", object)
            expect(db.getData("/")).toBe(object)
        })
        test('should merge the data at the root', () => {
            let object = {test: {test: ['Okay']}} as any
            db.push("/", object)
            const data = db.getData("/")
            expect(data).toBe(object)
            object = {test: {test: ['Perfect'], okay: "test"}} as any
            db.push("/", object, false)
            expect(JSON.stringify(db.getData("/"))).toEqual('{\"test\":{\"test\":[\"Okay\",\"Perfect\"],\"okay\":\"test\"}}')
        })
        test('should return right data for dataPath', () => {
            db = new JsonDB(testFile2, true)
            expect(JSON.stringify(db.getData("/test"))).toEqual('{\"test\":[\"Okay\",\"Perfect\"],\"okay\":\"test\"}')
        })

        test('should override only the data at dataPath', () => {
            const object = ['overriden']
            db.push("/test/test", object)
            expect(db.getData("/test/test")).toBe(object)
        })
        test(
            'should remove trailing Slash when pushing/getting data (/)',
            () => {
                const object = {test: {test: "test"}}
                db.push("/testing/", object)
                expect(db.getData("/testing")).toBe(object)
            }
        )

        test('should remove trailing Slash when deleting data (/)', () => {
            db.delete("/testing/")

            try {
                (function (args) {
                    db.getData(args)
                })('/testing')

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
            }
        })

        test('should merge the data at dataPath', () => {
            const object = ['test2']
            db.push("/test/test", object, false)
            expect(JSON.stringify(db.getData("/test/test"))).toEqual('[\"overriden\",\"test2\"]')
        })


        test('should create the tree to reach dataPath', () => {
            const object = ['test2']
            db.push("/my/tree/is/awesome", object, false)
            expect(JSON.stringify(db.getData("/my/tree/is/awesome"))).toEqual('[\"test2\"]')
        })
        test('should throw an Error when merging Object with Array', () => {
            try {
                (function (path, data, override) {
                    db.push(path, data, override)
                })("/test/test", {myTest: "test"}, false)

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
            }
        })

        test('should override a null constiable when merging', () => {
            const replacement = {a: 'test'}
            db.push('/null', {a: null}, false)
            db.push('/null', replacement, false)
            const data = db.getData('/null')
            expect(data['a']).toBe(replacement['a'])
        })

        test('should throw an Error when merging Array with Object', () => {
            try {
                (function (path, data, override) {
                    db.push(path, data, override)
                })("/test", ['test'], false)

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
            }
        })


        test('should throw an Error when asking for empty dataPath', () => {
            try {
                (function (args) {
                    db.getData(args)
                })("")

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
            }
        })

        test('should delete the data', () => {
            db.delete("/test/test")

            try {
                (function (args) {
                    db.getData(args)
                })("/test/test")

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
            }
        })

        test('should reload the file', () => {
            const data = JSON.stringify({test: "Okay", perfect: 1})
            fs.writeFileSync(testFile2 + ".json", data, 'utf8')
            db.reload()
            expect(db.getData("/test")).toBe("Okay")
            expect(db.getData("/perfect")).toBe(1)
        })
    })

    describe('Human Readable', () => {
        const db = new JsonDB(testFile3, true, true)
        test('should save the data in an human readable format', done => {
            const object = {test: {readable: "test"}}
            db.push("/", object)
            fs.readFile(testFile3 + ".json", "utf8", function (err, data) {
                if (err) {
                    done(err)
                    return
                }
                expect(data).toBe(JSON.stringify(object, null, 4))
                done()
            })
        })

    })
    describe('Array Support', () => {
        const db = new JsonDB(testFile4, true)
        test('should create an array with a string at index 0', () => {
            db.push('/arraytest/myarray[0]', "test", true)
            const myarray = db.getData('/arraytest/myarray')
            expect(myarray).toBeInstanceOf(Array)
            expect(myarray[0]).toBe('test')
        })

        test(
            'should throw an Error when using an array with a string at index TEST',
            () => {
                try {
                    (function (args) {
                        db.push('/arraytest/myarray[TEST]', "works", true)
                    })()

                    throw Error('Function did not throw')
                } catch (e) {
                    expect(e).toBeInstanceOf(DataError)
                    expect(e).toHaveProperty('id', 200)
                }
            }
        )

        test('should add an object at index 1', () => {
            const obj = {property: "perfect"}
            db.push('/arraytest/myarray[1]', obj, true)
            const myarray = db.getData('/arraytest/myarray')
            expect(myarray).toBeInstanceOf(Array)
            expect(myarray[1]).toBe(obj)
        })

        test('should create a nested array with an object at index 0', () => {
            const data = {test: "works"}
            db.push('/arraytest/nested[0]/obj', data, true)
            const obj = db.getData('/arraytest/nested[0]')
            expect(typeof obj).toBe('object')
            expect(obj).toHaveProperty('obj', data)
        })

        test('should access the object at index 1', () => {
            const obj = db.getData('/arraytest/myarray[1]')
            expect(typeof obj).toBe('object')
            expect(obj).toHaveProperty('property', 'perfect')

        })
        test('should access the object property at index 1', () => {
            const property = db.getData('/arraytest/myarray[1]/property')
            expect(typeof property).toBe('string')
            expect(property).toBe('perfect')
        })

        test('should throw an error when accessing non-present index', () => {
            const obj = {property: "perfect"}
            db.push('/arraytest/arrayTesting[0]', obj, true)

            try {
                (function (args) {
                    db.getData(args)
                })("/arraytest/arrayTesting[1]")

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
                expect(e).toHaveProperty('id', 10)
            }
        })

        test('should delete the object at index 1', () => {
            db.delete('/arraytest/myarray[1]')

            try {
                (function (args) {
                    db.getData(args)
                })("/arraytest/myarray[1]")

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
                expect(e).toHaveProperty('id', 10)
            }
        })

        test('should throw an error when deleting non-present index', () => {
            try {
                (function (args) {
                    db.delete(args)
                })("/arraytest/myarray[10]")

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
                expect(e).toHaveProperty('id', 10)
            }
        })

        test(
            'should throw an error when trying to set an object as an array',
            () => {
                db.push('/arraytest/fakearray', {fake: "fake"}, true)

                try {
                    (function (args) {
                        db.push(args, {test: 'test'}, true)
                    })("/arraytest/fakearray[1]")

                    throw Error('Function did not throw')
                } catch (e) {
                    expect(e).toBeInstanceOf(DataError)
                    expect(e).toHaveProperty('id', 11)
                }
            }
        )

        test(
            'should throw an error when trying to access an object as an array',
            () => {
                db.push('/arraytest/fakearray', {fake: "fake"}, true)

                try {
                    (function (args) {
                        db.getData(args)
                    })('/arraytest/fakearray[1]')

                    throw Error('Function did not throw')
                } catch (e) {
                    expect(e).toBeInstanceOf(DataError)
                    expect(e).toHaveProperty('id', 11)
                }
            }
        )
        test(
            'should throw an error when trying to set an object as an array (2)',
            () => {
                db.push('/arraytest/fakearray', {fake: "fake"}, true)

                try {
                    (function (args) {
                        db.push(args, {test: 'test'}, true)
                    })('/arraytest/fakearray[1]/fake')

                    throw Error('Function did not throw')
                } catch (e) {
                    expect(e).toBeInstanceOf(DataError)
                    expect(e).toHaveProperty('id', 11)
                }
            }
        )

        test('should merge nested arrays', () => {
            db.push('/merging/array[0]', ['test'])
            db.push('/merging/array[0]', ['secondTest'], false)
            const data = db.getData('/merging/array[0]')
            expect(data).toBeInstanceOf(Array)
            expect(data).toContain('test')
            expect(data).toContain('secondTest')
        })

        test('should remove the index of an array, not set it to null', () => {
            db.push('/deleteTest/array[0]', 'test')
            db.push('/deleteTest/array[1]', 'test2')
            db.delete('/deleteTest/array[1]')
            db.save(true)
            // @ts-ignore
            const json = JSON.parse(fs.readFileSync(testFile4 + '.json'))
            expect(typeof json.deleteTest).toBe('object')
            expect(json.deleteTest.array).toBeInstanceOf(Array)
            expect(json.deleteTest.array[0]).toBe('test')
            expect(json.deleteTest.array[1]).toBe(undefined)
        })

        test('should append a value to the existing array', () => {
            db.push('/arraytest/appendArray', [0], true)
            db.push('/arraytest/appendArray[]', 1, true)
            const array = db.getData('/arraytest/appendArray')
            expect(array).toBeInstanceOf(Array)
            const index1 = db.getData('/arraytest/appendArray[1]')
            expect(index1).toBe(1)
        })

        test('should throw an error when deleting a append command', () => {
            try {
                (function (args) {
                    db.delete(args)
                })('/arraytest/appendArray[]')

                throw Error('Function did not throw')
            } catch (e) {
                expect(e).toBeInstanceOf(DataError)
                expect(e).toHaveProperty('id', 10)
            }
        })

        test(
            'should append a value to the existing array and create property',
            () => {
                db.push('/arrayAppend/mySuperArray', [0], true)
                db.push('/arrayAppend/mySuperArray[]/test', 1, true)
                const array = db.getData('/arrayAppend/mySuperArray')
                expect(array).toBeInstanceOf(Array)
                const index1 = db.getData('/arrayAppend/mySuperArray[1]/test')
                expect(index1).toBe(1)
            }
        )

        test(
            'should throw an error when trying to append to a non array',
            () => {
                db.push('/arraytest/fakearray', {fake: "fake"}, true)

                try {
                    (function (args) {
                        db.push(args, {test: 'test'}, true)
                    })('/arraytest/fakearray[]/fake')

                    throw Error('Function did not throw')
                } catch (e) {
                    expect(e).toBeInstanceOf(DataError)
                    expect(e).toHaveProperty('id', 11)
                }
            }
        )
        describe('last item', () => {

            test(
                'should throw an exception when array is empty when using -1',
                () => {
                    db.push('/arraylast/myarrayempty', [], true)

                    try {
                        (function (args) {
                            db.getData(args)
                        })('/arraylast/myarrayempty[-1]')

                        throw Error('Function did not throw')
                    } catch (e) {
                        expect(e).toBeInstanceOf(DataError)
                        expect(e).toHaveProperty('id', 10)
                    }
                }
            )

            test('should set the fist item when using -1 on empty array', () => {
                db.push('/arraylast/emptyArray', [], true)
                db.push('/arraylast/emptyArray[-1]', 3)
                const lastItem = db.getData('/arraylast/emptyArray[0]')
                expect(lastItem).toBe(3)
            })

            test('should return the last key when using -1', () => {
                db.push('/arraylast/myarray', [1, 2, 3], true)
                const lastItem = db.getData('/arraylast/myarray[-1]')
                expect(lastItem).toBe(3)
            })
            test('should replace the last item when using -1', () => {
                db.push('/arraylast/a1', [1, 2, 3], true)
                db.push('/arraylast/a1[-1]', 5)
                const lastItem = db.getData('/arraylast/a1[-1]')
                expect(lastItem).toBe(5)
            })
            test('should delete the last item when using -1', () => {
                db.push('/arraylast/a2', [1, 2, 3], true)
                db.delete('/arraylast/a2[-1]')
                const lastItem = db.getData('/arraylast/a2[-1]')
                expect(lastItem).toBe(2)
            })
        })

    })

    describe('Delete Info', () => {
        const db = new JsonDB(testFile6, true)

        test(
            'should delete the data and save the file if saveOnPush is set',
            done => {
                const object = {test: {readable: "test"}}
                db.push("/", object)
                fs.readFile(testFile6 + ".json", "utf8", function (err, data) {
                    if (err) {
                        done(err)
                        return
                    }
                    expect(data).toBe(JSON.stringify(object))
                    db.delete('/test')
                    fs.readFile(testFile6 + ".json", "utf8", function (err, data) {
                        if (err) {
                            done(err)
                            return
                        }
                        expect(data).toBe(JSON.stringify({}))
                        done()
                    })
                })


            }
        )
    })

    describe('Cleanup', () => {
        test('should remove the test files', () => {
            fs.unlinkSync(testFile1 + ".json")
            fs.unlinkSync(testFile2 + ".json")
            fs.unlinkSync(testFile3 + ".json")
            fs.unlinkSync(testFile4 + ".json")
            fs.unlinkSync(testFile5 + ".json")
            fs.unlinkSync(testFile6 + ".json")
            fs.rmdirSync("test/dirCreation")
        })
    })

})