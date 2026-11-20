const fs = require('fs')

// Mock fs and child_process
jest.mock('fs')
jest.mock('child_process')

// Create a helper to simulate stdin using a ReadableStream (Web Streams API)
function createInputStream(input) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(input))
      controller.close()
    },
  })
}

// Helper to capture stdout/stderr
function setup() {
  const output = []
  const error = []
  return {
    options: {
      testing: true,
      print: (line, nl = true) => output.push(line + (nl ? '\n' : '')),
      error: (line, nl = true) => error.push(line + (nl ? '\n' : '')),
      color: false,
    },
    output: () => output.join('').trimEnd(),
    error: () => error.join('').trimEnd(),
  }
}

describe('ssed', () => {
  let ssed, options, output

  beforeEach(() => {
    jest.resetModules()
    ssed = require('./ssed')
    const newSetup = setup()
    options = newSetup.options
    output = newSetup.output
  })

  describe('basic line operations', () => {
    test('substitution with s/pattern/replace/', async () => {
      const input = createInputStream('hello world\nbye world')

      await ssed.main(['s/world/earth'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('hello earth\nbye earth')
    })

    test('global substitution with g/pattern/replace/', async () => {
      const input = createInputStream('hello hello world')

      await ssed.main(['g/hello/hi'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('hi hi world')
    })

    test('print matching lines with p/pattern/', async () => {
      const input = createInputStream('hello\nworld\nhello')

      await ssed.main(['p/hello/'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('hello\nhello')
    })
  })

  describe('line number operations', () => {
    test('substitute specific line with s:n:text', async () => {
      const input = createInputStream('line 1\nline 2\nline 3')

      await ssed.main(['s:2:replaced'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('line 1\nreplaced\nline 3')
    })

    test('print specific lines with p:range', async () => {
      const input = createInputStream('1\n2\n3\n4\n5')

      await ssed.main(['p:2-4'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('2\n3\n4')
    })
  })

  describe('document operations', () => {
    test('sort lines', async () => {
      const input = createInputStream('c\na\nb')

      await ssed.main(['sort'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('a\nb\nc')
    })

    test('reverse lines', async () => {
      const input = createInputStream('1\n2\n3')

      await ssed.main(['reverse'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('3\n2\n1')
    })

    test('join lines', async () => {
      const input = createInputStream('a\nb\nc')

      await ssed.main(['join'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('a b c')
    })

    test('join lines with empty separator', async () => {
      const input = createInputStream('a\nb\nc')

      await ssed.main(['join//'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('abc')
    })

    test('join/ (trailing delimiter) uses empty separator', async () => {
      const input = createInputStream('a\nb\nc')

      await ssed.main(['join/'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('abc')
    })
  })

  describe('conditional operations', () => {
    test('if/pattern/ with single rule', async () => {
      const input = createInputStream('hello\nworld\nhello')

      await ssed.main(['if/hello/', '{', 's/o/x', '}'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('hellx\nworld\nhellx')
    })

    test('between/start/end/ with rules', async () => {
      const input = createInputStream('start\n1\n2\nend\n3')

      await ssed.main(['between/start/end/', '{', 's/\\d/x', '}'], {
        ...options,
        input,
        inputFrom: 'stdin',
      })

      expect(output()).toBe('start\nx\nx\nend\n3')
    })
  })

  describe('status rule', () => {
    test.skip('handles previous command status (status rule not yet implemented)', async () => {
      const input = createInputStream('line1\nline2\nline3')

      await ssed.main(['status:0', '{', 'print:-1', '}', 'else', '{', 'print', '}'], {
        ...options,
        input,
        inputFrom: 'stdin',
        previousStatus: '0',
      })

      expect(output()).toBe('line3')

      const {options: options2, output: output2} = setup()
      await ssed.main(['status:0', '{', 'print:-1', '}', 'else', '{', 'print', '}'], {
        ...options2,
        input: createInputStream('line1\nline2\nline3'),
        inputFrom: 'stdin',
        previousStatus: '1',
      })

      expect(output2()).toBe('line1\nline2\nline3')
    })
  })

  describe('escape rule', () => {
    const input = [
      `it's "here"`,
      'plain text',
      'color \x1b[31mred\x1b[0m\ttab \\ back',
      '$HOME `cmd` ${x}',
      `hey!'`,
    ].join('\n')

    async function run(rule) {
      await ssed.main([rule], {
        ...options,
        input: createInputStream(input),
        inputFrom: 'stdin',
      })
      return output().split('\n')
    }

    test('escape (bash backslashes)', async () => {
      expect(await run('escape')).toEqual([
        `it\\'s \\"here\\"`,
        'plain text',
        'color \\e[31mred\\e[0m\\ttab \\\\ back',
        '$HOME `cmd` ${x}',
        `hey!\\'`,
      ])
    })

    test('escape/quotes (bash)', async () => {
      expect(await run('escape/quotes')).toEqual([
        `"it's \\"here\\""`,
        `'plain text'`,
        `$'color \\e[31mred\\e[0m\\ttab \\\\ back'`,
        `'$HOME \`cmd\` \${x}'`,
        `$'hey!\\''`,
      ])
    })

    test('escape/json', async () => {
      const expected = input.split('\n').map(line => JSON.stringify(line))
      expect(await run('escape/json')).toEqual(expected)
    })

    test('escape/js is an alias for json', async () => {
      const expected = input.split('\n').map(line => JSON.stringify(line))
      expect(await run('escape/js')).toEqual(expected)
    })

    test('escape/javascript picks the best quote', async () => {
      const lines = await run('escape/javascript')
      expect(lines).toEqual([
        '`it\'s "here"`',
        `'plain text'`,
        `'color \\u001b[31mred\\u001b[0m\\ttab \\\\ back'`,
        `'$HOME \`cmd\` \${x}'`,
        `"hey!'"`,
      ])
      const x = 'x'
      expect(lines.map(line => eval(line))).toEqual(input.split('\n'))
    })

    test.each(['escape/python', 'escape/py'])('%s', async rule => {
      const expected = [
        `'it\\'s "here"'`,
        `'plain text'`,
        `'color \\x1b[31mred\\x1b[0m\\ttab \\\\ back'`,
        `'$HOME \`cmd\` \${x}'`,
        `"hey!'"`,
      ]
      expect(await run(rule)).toEqual(expected)
    })

    test('escape rejects unknown formats', async () => {
      await expect(run('escape/bogus')).rejects.toThrow(
        "Invalid format for 'escape'",
      )
    })
  })

  describe('error handling', () => {
    test('rejects on invalid rule syntax', async () => {
      const {options} = setup()
      const input = createInputStream('test')

      await expect(
        ssed.main(['invalid/syntax'], {
          ...options,
          input,
          inputFrom: 'stdin',
        }),
      ).rejects.toThrow('Invalid rule')
    })

    test('does not reject on empty substitution', async () => {
      const {options} = setup()
      const input = createInputStream('test')

      await expect(
        ssed.main(['s//'], {
          ...options,
          input,
          inputFrom: 'stdin',
        }),
      ).resolves.not.toThrow()
    })
  })

  describe('file operations', () => {
    let mockFs

    beforeEach(() => {
      // After jest.resetModules(), ssed gets a new fs mock instance.
      // We must reference that same instance for assertions.
      mockFs = require('fs')
      mockFs.writeFileSync.mockClear()
      mockFs.readFileSync.mockClear()
      mockFs.existsSync.mockClear()
    })

    test('writes to file with --write', async () => {
      const {options} = setup()
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue('hello world')

      // Provide a ReadableStream as input directly, simulating what run() would
      // get after opening a file. We set writeToFile manually since --write with
      // inputFrom='stdin' requires a filename.
      await ssed.main(['s/world/earth'], {
        ...options,
        inputFrom: 'stdin',
        input: createInputStream('hello world'),
        write: true,
        diff: true,
        writeToFile: 'test.txt',
        diffContext: 3,
      })

      expect(mockFs.writeFileSync).toHaveBeenCalledWith('test.txt', 'hello earth')
    })
  })
})
