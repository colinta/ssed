Usage
-----
    > ssed --help
    > something | ssed [commands]
    > <input ssed --explain [commands]
    > ssed [commands] <file

All commands use a "g/re/p"-like syntax:

    cmd/match[/replace][/flags]

About
-----
ssed is an alternative to 'sed'. Not a drop-in replacement, but used for
similar tasks. I wanted more familiar and modern Regex support, and have
kept adding more functions as ssed became more and more my go-to text
manipulation tool.

Line rules transform on a line-by-line basis and, if only line rules are
employed, support STDIN streaming.

Document rules transform the entire document. STDIN is read to completion
before document rules are executed.

Like sed, and symbol can be used to separate the rule arguments, but unlike sed
*some* separators change the behaviour of the command. The special separators
*are ':' and '\`'.

Separators
----------
The separator can change the behaviour of the line rule. Rules that support
pattern matches likely also support line and literal matches.

    /  Default separator, indicates Regex. Supports flags.
    :  Indicates a line-number rule
    \`  Indicates a literal string match
       All other delimiters indicate Regex

    s/\\w+/bar      regex match
    s|\\w+|bar      alternative separator
    s|\\w+|bar|i    with case insensitive flag enabled

    s\`foo\`bar      literal match against 'foo'
    s:1:bar        matches line 1

    s{\\w+}bar      brackets can also be used (regex match)
    s{\\w+}bar}i    but they don't have to match

Options
-------
    --explain                    Explains what the command will do.

    --diff                       Only show differences
    --no-diff                    Do not show differences

    --color                      Enable ANSI colors (true if stdout is a TTY)
    --no-color                   Disable ANSI colors

    --ls                         Read file names from standard input (\`ls | ssed --ls\`)

    --input=fromfile             Use 'fromfile' as input.
    --input fromfile

    --input=fromfile1,fromfile2  Run against multiple files.
    --input fromfile1 --input fromfile2

    --no-input                   Do not use any file as input.

    --write                      Write each changed file in place.
    --write=tofile               Provide a destination file name.
    --write-rename=%.backup      Use the input filename in place of '%'
    --no-write                   Do not write each changed file in place.

    --interactive                Ask before writing the file
    --no-interactive             Do not ask before writing the file

    --dry-run (-n)               Show which files would be affected.
    --no-dry-run                 Do not show which files would be affected.

Line Rules
----------
Line rules operate on every line. Commands 'on', 'after' and 'off' share the
on/off state.

    s/$search/$replace                Replace the first instance of 'search' with 'replace'
    (aka sub/…/…)
    g/$search/$replace                Replace every instance of 'search' with 'replace'
    (aka gsub/…/…)
    t/$pattern (aka take/…)         Only print the matching part of the line, or print the entire line if 'pattern' doesn't match
    r/$pattern (aka rm/…)           Remove the matching part of the line, or print the entire line if 'pattern' doesn't match
    1/$pattern                      Only print the first group of the match
    1                               Only print the first "column" (columns are separated by whitespace)
    cols/$pattern/$columns          Split the line by 'pattern' (default is /\\s+/) and print columns (joined by ' ')
    cols/$pattern/$columns/$joiner  Same, but columns are joiner by $joiner

    on/$pattern                     Start printing on the line where 'pattern' is matched
    off/$pattern                    Stop printing on the line where 'pattern' is matched
    after/$pattern                  Start printing on the line *after* 'pattern' is matched
    toggle/$pattern                 Turn printing off at the matching line, then off, then on...

    p/$pattern (aka print/…)        Only print lines that match 'pattern'
    d/$pattern (aka del/…)          Do not print lines that match 'pattern'
    !p/$pattern (aka !print/…)      Alias for d/del because I can't remember one (d) and always remember the other (p)

    prepend/$text (aka prefix/…)
    append/$text (aka suffix/…)     Adds text to the beginning (prepend) or end (append) of the line
    surround/$prefix/$suffix

    uniq (aka unique)               Only print unique lines
    uniq/$pattern                   Only print matching lines, and only unique matches (uniqueness is determined by the matching regex)

Document Rules
--------------
    sublines/$pattern/$replace    For every line that matches, insert one line from replace. Remaining lines will
         (aka sl/…)               be inserted into the last matched line. Does not do regex replacement.

    sort  sort/$pattern           Sort the lines alphabetically using localeCompare.
                                  If a pattern is provided, the matching part of the line will be used, but the
                                  entire line will be printed.
    sortn   sortn/$pattern        Sort the lines numerically. If no pattern is given, it matches the *first* number.
    reverse                       Obvious
    line                          Prepend each line with the line number

    begin:$prepend
    border:$prepend:$append       Prepend, append, or surround the document (add header/footer)
    end:$append
    join     join/$separator      Join lines with a space (or optional separator)

Conditions
----------
You can apply rules only under certain conditions, e.g. 'if/{pattern} {rule}'
only runs \`rule\` only lines that match \`pattern\`.

You can even group rules using \`{ rules… }\`, and rules can be negated with a
preceding '!'.

    if/$pattern $rule
    !if/$pattern $rule
    between/$onPattern/$offPattern $rule

Example:
    ssed 'if/first-name|last-name' { s/colin/REDACTED/i s/gray/REDACTED/i }

Line Number rules
-----------------
Using the special delimiter ':' you can apply most rules on line numbers instead
of line content. In the case of the 'sub' command, the entire line will be
replaced with the literal text.

For example
    s:1:replace  Replaces line 1 with the word "replace"
    p:1          Only print line 1

Not all rules support this feature, but typically any rule that _could_ support it, _does_

Line numbers can be expressed as a single number, a range, an open range, a
modulo operation (with offset), and a comma-separated list of line rules.
    p:1                 Only matches the line number (only matches line 1)
    p:%2                Matches lines that are modulo-N (even lines)
    p:%2-1              Matches lines that are modulo-N minus Y (odd lines)
    p:1,3,5             Matches the listed line numbers (and only these)
    p:1-5               Matches the range of number, inclusive (1,2,3,4,5)
    p:9-                Matches the line number and all subsequent lines (lines 9 and onward)
    p:-9                Matches lines up to and including the line number (lines 1-9)
    p:1-5,10-15,20,30+  Line rules can be mixed and matched
