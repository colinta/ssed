# `ssed`

I was fed up with sed's obtuse regular expression syntax/support. Yeah, when
_JavaScript_ has a more sensible implementation, you know you have troubles.

15 minutes later I had `ssed`. I think the README took longer than the tool!

## Installation

    npm install -g ssed

## Usage

    > ssed --help
    > something | ssed [commands]

All commands use a "g/re/p"-like syntax:

    cmd/match[/replace]

All rules are run on every line, the output of one is fed into the next. If any step filters the line, the rest of the rules are skipped and the next line is processed.

Most commands can alternatively work on _line numbers_ instead of a regex match

    cat file | ssed print:1-5,10+   #  prints lines 1-5, also line 10 until the end of the file

###### Substitute
    sub/pattern/replace
    s/pattern/replace

Replaces the first match.

    echo what a test | ssed sub/w/W
    => What a test
    echo what a test | ssed 's/(\w+)/$1$1'
    => whatwhat a test

###### Global Substitute
    gsub/pattern/replace
    g/pattern/replace

Replaces all occurences of the pattern.

    echo what a test | ssed gsub/t/T
    => whaT a TesT
    echo what a test | ssed g/[a-su-z]/.
    => ...t . t..t

###### "Take"
    take/pattern
    t/pattern

Prints the matching regex (or the entire line if there is no match).

    echo 'what a test' | ssed 'take/t\w+'
    => test
    echo -e "what
    > a
    > great test" | ssed '+/t\w+t'
    => what
    a
    test

###### "Nth"
    1/pattern
    2/pattern
    3/pattern
    ...

Prints the n-th group in the regex (or the entire line if there is no match).

    echo 'what a test' | ssed '1/(\w+) (\w+) (\w+)'
    => what
    echo 'what a test' | ssed '2/(\w+) (\w+) (\w+)'
    => a
    echo 'what a test' | ssed '3/(\w+) (\w+) (\w+)'
    => test

###### "Remove"
    remove/pattern
    rm/pattern
    r/pattern

Removes the matching part of the regex (or the entire line if there is no match).

    echo 'what a test' | ssed 'rm/t\w+'
    => what a
    echo -e "what
    > a
    > great test" | ssed 'rm/t\w+t'
    => what
    a
    great

###### On
    on/pattern
    o/pattern

Turns on printing starting at the matching line. Until then, no lines will be printed. This feature uses a simple global "printOn" boolean, so don't go nesting multiple `on` commands, they'll step all over each other.

    echo -e "what
    > a
    > great test" | ssed 'on/^a'
    => a
    great test

###### After
    after/pattern
    a/pattern

Just like `on` but doesn't print the matching line, it starts printing on the following line.

###### Off
    off/pattern
    f/pattern

Turns _off_ printing, only useful following an `on` or `after` command.

    echo -e "this
    > is
    > a
    > really
    > great
    > test" | ssed 'on/^a' off/test
    => a
    really
    great

###### Print
    print/pattern
    p/pattern

Prints the line if the pattern matches, skips it otherwise. I'm pretty sure this is an actual `sed` command! But who knows, `sed` is a mess.

    echo -e "you
    > get
    > it
    > by
    > now,
    > right?" | ssed 'p/[a-m]'
    => get
    it
    by
    right?

###### Kill
    kill/pattern
    k/pattern

Skips matching lines, inverse of `print`.

    echo -e "you
    get
    it
    by
    now,
    right?" | ssed 'p/[a-m]'
    => you
    now,

###### Delimiters

Other delimiters are supported. Trailing delimiter is optional.

    sub|match|replace
    s/match/replace/

Bracket delimiters “work”, but they don't have to actually _match_, e.g. these are all equivalent:

    g{match}replace
    g}match{replace
    g}match}replace
    g{match{replace

###### As-is

I offer this up as-is. I'm happy to discuss PRs and bug fixes, but feature requests (as in "Why doesn't it…" or "Can you implement…") might be summarily closed with not so much as a by-your-leave. If you want it, write it yourself, this is some scrappy, easy JavaScript. Who has time for lazy programmers in <?= date('Y') %>!?
