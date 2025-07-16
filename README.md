ssed(1) -- general purpose stream and file editor
========


SYNOPSIS
-----

    ssed --help
    something | ssed [commands]
    <input ssed --explain [commands]
    ssed [commands] <file

All editor rules use a "g/re/p"-like syntax:

    cmd/match[/replace][/flags]


DESCRIPTION
-----
ssed is an alternative to 'sed'. Not a drop-in replacement, but used for similar tasks. I wanted more familiar and modern Regex support, and have kept adding more functions as ssed became more and more my go-to text manipulation tool.

Line rules transform on a line-by-line basis and, if only line rules are employed, support STDIN streaming.

Document rules transform the entire document. STDIN is read to completion before document rules are executed.

Like sed, any symbol can be used to separate the rule arguments, but unlike sed *some* separators change the behaviour of the command. The special separators are ':' and '\`'.


OPTIONS
-------

Options and rules can be interleved in any order, it won't affect the behaviour (you cannot set options for specific rules).

Most options can be turned off using the \`--no-\` prefix, e.g. \`--no-dry-run\`. The exception is \`--input\`, \`--ls\`, and \`--stdin\`, which all control where input comes from. The last option wins.

* \`--diff\` (\`--no-diff\`)
Show differences instead of streaming the output.
* \`--diff-context=N\`, \`--diff-context N\`
Show differences instead of streaming the output. Also implies \`--diff\`.

* \`--stdin\`
(Default) Run rules against standard input.
* \`--ls\`
Read file names from standard input (\`ls | ssed --ls\`).
* \`--input=fromfile\`, \`--input fromfile\`
Use 'fromfile' as input.
* \`--input=fromfile1,fromfile2\`, \`--input fromfile1 --input fromfile2\`
Run all rules against multiple files.

* \`--write\` (\`--no-write\`)
Write each changed file in place (\`sed -i\`)
* \`--write-to=tofile\`, \`--write-to tofile\`, also \`--write=tofile\`
Provide a destination file name.
* \`--write-rename=%.backup\`, \`--write-rename %.backup\`
Replace '%' with the input filename.

* \`--interactive\` (\`--no-interactive\`)
Ask before writing the file(s). TODO: I want to use @teaui/core to create an interactive TUI app.

* \`--dry-run\`, \`-n\` (\`--no-dry-run\`)
Show which files would be affected.

* \`--explain\`
Explains what the command will do. Still a work in progress.

* \`--help\` \`--version\`
Yes these work.

* \`--color\` (\`--no-color\`)
Enable ANSI colors (true if stdout is a TTY)


SEPARATORS
----------

The separator can change the behaviour of the line rule. Rules that support pattern matches likely also support line and literal matches.

* \`:\`
Indicates a line-number rule. Not all rules support line numbers. Line numbers are not reset between rules (use the \`cat\` rule to reset line numbers).

* \`\\\`\`, \`\\"\`, \`\\'\`
Indicates a literal string match.

    ssed "s'foo'bar"
    ssed 's"foo"bar'
    ssed 's\`foo\`bar'

* \`/\`, \`|\`, \`=\`, \`-\`, \`{..}\`
All other separators will use Regex with support for \`i, g\` flags. Matching brackets can also be used.

    ssed s/foo/bar/
    ssed s/foo/bar/i
    ssed s=foo=bar=
    ssed s-foo-bar-
    ssed 's|foo|bar|'
    ssed s{foo}bar{i


LINE RULES
----------

Line rules operate on every line. Commands 'on', 'after' and 'off' share the on/off state. Rules can be grouped using \`{, }\`, especially used with conditional rules.

* \`s/$search/$replace\`, \`sub/$search/$replace\`, \`sub:$lines:$text\`
Replace the first instance of $search with $replace, or replace matching $lines with literal $text

* \`g/$search/$replace\`, \`gsub/$search/$replace\`
Replace every instance of 'search' with 'replace'. Does not support line numbers.

* \`p/$pattern\`, \`print/$pattern\`, \`p:$lines\`, \`grep/$pattern\`
Only print lines that match $pattern (or $lines)
* \`d/$pattern\`, \`del/$pattern\`, \`d:$lines\`
Do not print lines that match 'pattern' (or $lines)
* \`!p\`, \`!print\` => \`del\`
Alias for \`del\` because I find it easier to remember.

* \`t/$pattern\`, \`take/$pattern\`
Only print the matching part of the line, or print the entire line if 'pattern' doesn't match
* \`tp/$pattern\`, \`takeprint/$pattern\`, \`pt/$pattern\`
Only print the matching part of the line, and only print the lines that match
* \`r/$pattern\`, \`rm/$pattern\`
Remove the matching part of the line, or print the entire line if 'pattern' doesn't match
* \`rp/$pattern\`, \`rmprint/$pattern\`, \`pr/$pattern\`
Remove the matching part of the line, and only print the lines that match
* \`1/$pattern\`, \`2/$pattern\`, …
Only print the first (or 2nd, or 3rd, …) group of the match
* \`1\`, \`2\`, …
Same, columns are separated by whitespace
* \`1"\`, \`2'\`, …
Same, columns can be surrounded by quotes

* \`prepend/$text\`, \`prefix/$text\`, \`append/$text\`, \`suffix/$text\`
Adds text to the beginning (prepend) or end (append) of the line
* \`surround/$prefix/$suffix\`, \`surround/$both\`
Adds text to the beginning *and* end of the line
* \`quote\`
Surrounds the line in double quotes, replacing " with \\"
* \`unquote\`
Removes initial and final matching quotes from the line. Preceding and trailing whitespace is preserved (\`trim\` to remove).

* \`cols/$pattern/$columns\` e.g. \`cols/,/1,2,3\`
Split the line by 'pattern' (default is \`/\\s+/\`) and print $columns, joined by ' '
* \`cols/$pattern/$columns/$joiner\`
Same, but columns are joined by $joiner

* \`on/$pattern\`, \`on:$lines\`
Start printing on the line where $pattern/$lines is matched. If no pattern is given, the first line matches.
* \`off/$pattern\`, \`off:$lines\`
Stop printing on the line where $pattern/$lines is matched. If no pattern is given, the first line matches.
* \`after/$pattern\`, \`after:$lines\`
Start printing on the line *after* $pattern/$lines is matched.
* \`toggle/$pattern\`, \`toggle:$lines\`
Turn printing off at the matching line, then off, then on...

* \`uniq\`, \`unique\`, \`uniq/$pattern\`
Only print unique lines. Optionanly, uniqueness can be determined by the matching regex. The entire line is still printed.

* \`tap\`
Prints the *current document* to STDERR. Usefull for debugging, or in conjunction with \`--write\` to verify expected output.

DOCUMENT RULES
--------------

Document rules operate on the entire document, and so processing will not begin until the entire input is read. If you are streaming from STDIN, you cannot use document rules with a stream that will never finish (e.g. \`tail | sed sort\` won't work).

* \`sublines/$pattern/$replace\`, \`sl/$pattern/$replace\`
For every line that matches, insert one line from replace. Remaining lines will be inserted into the last matched line. Does not do regex replacement.

* \`sort\`, \`sort/$pattern\`
Sort the lines alphabetically using localeCompare. If a pattern is provided, the matching part of the line will be used, but the entire line will be printed.
* \`sortn\`, \`sortn/$pattern\`
Sort the lines numerically. If no pattern is given, it matches the *first* number (ignoring all preceding non-number characters).

* \`reverse\`
Obvious, I think.
* \`line\`, \`lines\`
Prepend each line with the line number.

* \`begin:$prepend\`, \`end:$append\`, \`border:$prepend:$append\`
Prepend, append, or surround the document (i.e. add header/footer to the document). These are named after awk's BEGIN/END commands.

* \`join\`, \`join/$separator\`
Join lines with a space or $separator.

* \`cat\`
Print the entire document. This is useful for resetting line numbers.

CONDITIONS
----------

You can apply rules only under certain conditions, e.g. 'if/{pattern} {rule}' only runs \`rule\` only lines that match \`pattern\`.

You can group rules using \`{ rule1 rule2 … }\`, and rules can be negated with a preceding '!'.

* \`if/$pattern [rule]\`, \`if:$lines [rule]\`
Only run \`rule\` if the line matches $pattern/$lines.
* \`!if/$pattern [rule]\` \`!if:$lines [rule]\`
Run \`rule\` on lines that *don't* match $pattern/$lines.

* \`between/$onPattern/$offPattern [rule]\`, \`between:$onLines:$offLines [rule]\`
Starting at $onPattern/$onLines, apply [rule] until $offPattern/$offLines.
* \`!between/$onPattern/$offPattern [rule]\`
Run [rule] on all lines that are not between $onPattern/$offPattern.

* \`ifany/$pattern [rule]\`
Runs [rule] on *all lines* if any line matches $pattern. Supports $lines, which can be used to run [rule] if the document is/isn't a minimum length.
* \`ifnone/$pattern [rule]\`, \`!ifany/$pattern [rule]\`
Runs [rule] on *all lines* as long as *no lines* match $pattern.

### Example

    ssed 'if/(first-name|last-name):' { s/colin/REDACTED-FIRST/i s/gray/REDACTED-LAST/i }

This rule will only run on lines that include 'first-name:' or 'last-name:'. On only those lines, it will replace 'colin'/'gray' with 'REDACTED-FIRST'/'REDACTED-LAST'.

LINE NUMBER RULES
-----------------

Using the special delimiter ':' you can apply most rules on line numbers instead of line content. In the case of the 'sub' command, the entire line will be replaced with the literal text.

Not all rules support this feature, but typically any rule that _could_ support it, _does_

### Example

* \`s:1:replace\`
Replaces line 1 with the word "replace"
* \`p:1\`
Only print line 1

Line numbers can be expressed as a single number, a range, an open range, a modulo operation (with offset), and a comma-separated list of line rules.
* \`p:1\`
Only matches the line number (only matches line 1)
* \`p:%2\`
Matches lines that are modulo-N (even lines)
* \`p:%2-1\`
Matches lines that are modulo-N minus Y (odd lines)
* \`p:1,3,5\`
Matches the listed line numbers (and only these)
* \`p:1-5\`
Matches the range of number, inclusive (1,2,3,4,5)
* \`p:9-\`
Matches the line number and all subsequent lines (lines 9 and onward)
* \`p:-9\`
Matches lines up to and including the line number (lines 1-9)
* \`p:1-5,10-15,20,30+\`
Line rules can be mixed and matched
