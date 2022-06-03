async function main () {
    // const { init } = require('dcp-client')
    // await init('https://scheduler.distributed.computer')
    const compute = require('dcp/compute')
    const {performance} = require('perf_hooks');
  
    // * helper functions
    function newtonIteration (n, x0) {
      const x1 = (n / x0 + x0) >> 1n
      if (x0 === x1 || x0 === x1 - 1n) {
        return x0
      }
      return newtonIteration(n, x1)
    }
  
    function sqrt (value) {
      if (value < 0n) {
        throw 'square root of negative numbers is not supported'
      }
  
      if (value < 2n) {
        return value
      }
      return newtonIteration(value, 1n)
    }
  
    function sum (array) {
      var count = 0
      for (var i = 0, n = array.length; i < n; i++) {
        count += array[i]
      }
      return count
    }
  
    // * Prime test
    function isPrime (p) {
      big_p = BigInt(p)
      if (big_p == 2n) {
        return true
      } else if (big_p <= 1n || big_p % 2n === 0n) {
        return false
      } else {
        var to = sqrt(big_p)
        for (var i = 3n; i <= to; i += 2n)
          if (big_p % i == 0n) {
            return false
          }
        return true
      }
    }
  
    // * Slice shaping function
    function end_case (lists, limit) {
      i = 0
      while (i < lists.length) {
        if (i == 0) {
          if (sum(lists[i]) + sum(lists[lists.length - 1]) < limit) {
            lists[lists.length - 1] = lists[lists.length - 1].concat(lists[i])
            var ind = lists.indexOf(lists[i])
            if (ind !== -1) {
              lists.splice(ind, 1)
            }
          }
        } else {
          if (sum(lists[i]) + sum(lists[i - 1]) < limit) {
            lists[i - 1] = lists[i - 1].concat(lists[i])
            var ind = lists.indexOf(lists[i])
            if (ind !== -1) {
              lists.splice(ind, 1)
            }
            i -= 1
          }
        }
        i += 1
      }
      return lists
    }
  
    function reshape (primes, limit) {
      primes.reverse()
      reshaped_primes = []
      while (primes.length != 0) {
        new_sublist = []
        length = primes.length
        for (i = 0; i < length; i++) {
          if (sum(new_sublist) + primes[i] <= limit) {
            new_sublist.push(primes[i])
            primes.splice(i, 1)
            length -= 1
          }
        }
        if (new_sublist != []) {
          reshaped_primes.push(new_sublist)
        }
      }
      return end_case(reshaped_primes, limit)
    }
  
    function gen_tests (size) {
      input_set = new Array(size).fill(null)
      counter = 0
      for (i = 1; i < size + 1; i++) {
        if (isPrime(i)) {
          input_set[counter] = i
          counter += 1
        }
      }
      return input_set.slice(0, counter)
    }
  
    // * Input definition
    inputSet = reshape(gen_tests(20000), 300000)
    // console.log('input_set: ', inputSet)
  
    // * Work function
    function work_function (input_slice) {
      progress()
      function isMersennePrime (p) {
        big_p = BigInt(p)
        if (big_p == 2n) {
          return true
        } else {
          var m_p = (1n << big_p) - 1n
          var s = 4n
          for (var i = 3n; i <= big_p; i++) {
            s = (s * s - 2n) % m_p
          }
          return s === 0n
        }
      }
  
      var outputs = []
      for (const i of input_slice) {
        outputs.push([i, isMersennePrime(i)])
      }
      return outputs
    }
  
    // // * Test
    // for (const i of inputSet) {
    //   console.log('work_result: ', work_function(i))
    // }
  
    // * Create and execute the job
    start = performance.now()
    console.log(inputSet);
    const job = compute.for(inputSet, work_function)
    job.public.name = 'primes'
    // Not mandatory console logs for status updates
    job.on('accepted', () => {
      console.log(` - Job accepted by scheduler, waiting for results`);
      console.log(` - Job has id ${job.id}`);
      startTime = Date.now();
    });

    job.on('readystatechange', (arg) => {
        console.log(`new ready state: ${arg}`);
    });

    job.on('result', (ev) => {
        console.log(
            ` - Received result for slice ${ev.sliceNumber} at ${Math.round((Date.now() - startTime) / 100) / 10
            }s`,
        );
    });
    job.on('status', (ev) => {
        console.log('Got status update: ', ev)
    })

    
    job.computeGroups = [{ joinKey: "ovwatch", joinSecret: "0UFRCfojif" }];
    const results = await job.exec()
    end = performance.now()
    resultSet = Array.from(results)
    console.log(resultSet)
    console.log('Time cost: ', end - start)
  }
  
  require('dcp-client')
    .init('https://scheduler.distributed.computer')
    .then(main)