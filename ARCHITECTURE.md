# ssed Architecture

**ssed** is a modern text transformation tool that processes input through a pipeline of composable rules. Unlike traditional sed, it uses standard regex syntax and provides a rich set of operations for line-by-line and document-level transformations.

## Core Concepts

### Rules

Rules are the fundamental unit of operation. Each rule takes input text and produces transformed output. Rules are classified into two categories based on how they process input:

**Line Rules** process input one line at a time:
- Can stream input without buffering the entire document
- Enable real-time processing of large files or infinite streams
- Examples: substitution, filtering, trimming, column extraction

**Document Rules** require the entire document:
- Buffer all input before processing begins
- Enable operations that span multiple lines
- Examples: sorting, reversing, joining lines

### Rule Pipeline

Rules are processed in a pipeline where the output of one rule feeds into the next:

```
Input → Rule 1 → Rule 2 → Rule 3 → Output
```

The pipeline automatically handles the boundary between line rules and document rules:
1. Line rules stream through first
2. When a document rule is encountered, all output is buffered
3. Document rule processes the buffer
4. Subsequent rules continue with the result

### Delimiters

Rules use delimiters to separate their arguments. The choice of delimiter affects matching behavior:

| Delimiter | Matching Mode | Example |
|-----------|---------------|---------|
| `/`, `\|`, `=`, `-` | Regex pattern | `s/foo.*/bar/` |
| `{...}` | Regex pattern | `s{foo.*}{bar}` |
| `` ` ``, `'`, `"` | Literal string | `` s`foo`bar `` |
| `:` | Line numbers | `s:1:replacement` |

### Line Number Syntax

Line-based operations support flexible line specification:

- `1` - Single line
- `1-5` - Inclusive range
- `5-` - From line 5 to end
- `-5` - From start to line 5
- `%2` - Every 2nd line (modulo)
- `%2-1` - Every 2nd line with offset
- `1,3,5,10-15` - Multiple ranges/lines

### Conditional Blocks

Rules can be applied conditionally using condition wrappers:

```
if/pattern/ { rules }       # Apply to matching lines
!if/pattern/ { rules }      # Apply to non-matching lines
between/start/end/ { rules } # Apply between patterns
ifany/pattern/ { rules }    # Apply to all if any line matches
```

Conditions can be chained: `if/foo/ if/bar/ { rules }`

## Rule Categories

### Substitution Rules
- **s/pattern/replace/** - Replace first match per line
- **g/pattern/replace/** - Replace all matches per line

### Filtering Rules
- **p/pattern/** - Print only matching lines (grep)
- **d/pattern/** - Delete matching lines (inverse grep)
- **!p/pattern/** - Alias for delete

### Extraction Rules
- **t/pattern/** - Take matching portion (or whole line if no match)
- **r/pattern/** - Remove matching portion
- **tp/pattern/** - Take + print (filter to matches, extract match)
- **rp/pattern/** - Remove + print (filter to matches, remove match)

### Text Modification Rules
- **prepend/text/** - Add text to start of line
- **append/text/** - Add text to end of line
- **surround/prefix/suffix/** - Wrap line
- **trim/** - Remove leading/trailing whitespace
- **quote/** - Wrap in double quotes
- **unquote/** - Remove outer quotes

### Column Rules
- **cols//1,3,2** - Split by whitespace, select/reorder columns
- **cols/delimiter/columns** - Split by custom delimiter
- **cols/delimiter/columns/separator** - Custom output separator

### Group Extraction Rules
- **1/pattern/** - Extract first regex capture group
- **2/pattern/** - Extract second regex capture group
- **1**, **2**, etc. - Extract whitespace-separated columns

### Control Flow Rules
- **on/pattern/** - Start printing at match
- **off/pattern/** - Stop printing at match
- **after/pattern/** - Start printing after match
- **toggle/pattern/** - Toggle printing state

### Document Rules
- **sort/** - Alphabetic sort
- **sortn/** - Numeric sort
- **reverse** - Reverse line order
- **join/separator** - Join lines with separator
- **lines/** - Prepend line numbers
- **begin:text/** - Prepend to document
- **end:text/** - Append to document
- **count** - Output line count

### Utility Rules
- **uniq/** - Remove consecutive duplicates
- **split/pattern/** - Split each line into multiple lines
- **insert/pattern/text/** - Insert text after matching lines
- **xargs/command/** - Execute command for each line
- **exec/** - Execute document as shell script
- **tap/** - Debug output to stderr

## Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                        Input Stage                          │
├─────────────────────────────────────────────────────────────┤
│  Source: stdin | file | multiple files | ls mode (files)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Line Processing Stage                   │
├─────────────────────────────────────────────────────────────┤
│  For each line:                                             │
│    1. Apply all LineRules in order                          │
│    2. Rules can transform, filter, or split the line        │
│    3. Output streamed immediately if no DocumentRules exist │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Document Processing Stage                 │
├─────────────────────────────────────────────────────────────┤
│  If DocumentRules present:                                  │
│    1. Buffer all line rule output                           │
│    2. Apply each DocumentRule to buffer                     │
│    3. DocumentRules can reorder, join, or transform buffer  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Output Stage                         │
├─────────────────────────────────────────────────────────────┤
│  Destination: stdout | file (--write) | diff display        │
│  Options: dry-run, color output, diff context               │
└─────────────────────────────────────────────────────────────┘
```

## State Management

### Global State (per execution)
- **printOn**: Boolean or null for on/off/toggle commands
- **lineNumber**: Current line number (1-indexed)
- **conditionOn**: State for between conditions

### Rule State
Each rule may maintain internal state:
- **uniq**: Previous line for duplicate detection
- **between**: Whether currently inside the range
- **control flow**: Current on/off state

State is reset at the beginning of each execution.

## Command-Line Interface

### Input Options
- `--stdin` (default) - Read from standard input
- `--input=file` - Read from file
- `--ls` - Read filenames from stdin, process each file

### Output Options
- Default: Write to stdout
- `--write` - In-place file editing
- `--write-to=file` - Write to specific file
- `--write-rename=pattern` - Backup before overwriting
- `--diff` - Show diff instead of output

### Control Options
- `--dry-run`, `-n` - Preview changes without writing
- `--explain` - Show what rules will do
- `--color` / `--no-color` - Control colored output

## Error Handling

Errors are categorized as:
- **Argument Errors**: Invalid command-line arguments or rule syntax
- **Parse Errors**: Malformed rule patterns or delimiters
- **Runtime Errors**: Failures during rule execution (e.g., subprocess failures)

Errors include the rule that caused them and context for debugging.

## Design Principles

1. **Composability**: Rules combine naturally through piping
2. **Predictability**: Standard regex syntax, no surprises
3. **Streaming**: Line rules enable processing of infinite streams
4. **Readability**: Rule syntax is more verbose but clearer than sed
5. **Safety**: Dry-run and diff modes for safe experimentation
