/// <reference path="..\harness.ts" />
/// <reference path="..\..\server\editorServices.ts" />

namespace ts {
    function editFlat(position: number, deletedLength: number, newText: string, source: string) {
        return source.substring(0, position) + newText + source.substring(position + deletedLength, source.length);
    }

    function lineColToPosition(lineIndex: server.LineIndex, line: number, col: number) {
        const lineInfo = lineIndex.lineNumberToInfo(line);
        return (lineInfo.offset + col - 1);
    }

    function validateEdit(lineIndex: server.LineIndex, sourceText: string, position: number, deleteLength: number, insertString: string): void {
        const checkText = editFlat(position, deleteLength, insertString, sourceText);
        const snapshot = lineIndex.edit(position, deleteLength, insertString);
        const editedText = snapshot.getText(0, snapshot.getLength());

        assert.equal(editedText, checkText);
    }

    describe(`VersionCache TS code`, () => {
        let validateEditAtLineCharIndex: (line: number, char: number, deleteLength: number, insertString: string) => void;

        before(() => {
            const testContent = `/// <reference path="z.ts" />
var x = 10;
var y = { zebra: 12, giraffe: "ell" };
z.a;
class Point {
    x: number;
}
k=y;
var p:Point=new Point();
var q:Point=<Point>p;`;

            const { lines } = server.LineIndex.linesFromText(testContent);
            assert.isTrue(lines.length > 0, "Failed to initialize test text. Expected text to have at least one line");

            const lineIndex = new server.LineIndex();
            lineIndex.load(lines);

            validateEditAtLineCharIndex = (line: number, char: number, deleteLength: number, insertString: string) => {
                const position = lineColToPosition(lineIndex, line, char);
                validateEdit(lineIndex, testContent, position, deleteLength, insertString);
            };
        });

        after(() => {
            validateEditAtLineCharIndex = undefined;
        });

        it(`change 9 1 0 1 {"y"}`, () => {
            validateEditAtLineCharIndex(9, 1, 0, "y");
        });

        it(`change 9 2 0 1 {"."}`, () => {
            validateEditAtLineCharIndex(9, 2, 0, ".");
        });

        it(`change 9 3 0 1 {"\\n"}`, () => {
            validateEditAtLineCharIndex(9, 3, 0, "\n");
        });

        it(`change 10 1 0 10 {"\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n"}`, () => {
            validateEditAtLineCharIndex(10, 1, 0, "\n\n\n\n\n\n\n\n\n\n");
        });

        it(`change 19 1 1 0`, () => {
            validateEditAtLineCharIndex(19, 1, 1, "");
        });

        it(`change 18 1 1 0`, () => {
            validateEditAtLineCharIndex(18, 1, 1, "");
        });
    });

    describe(`VersionCache simple text`, () => {
        let validateEditAtPosition: (position: number, deleteLength: number, insertString: string) => void;
        let testContent: string;
        let lines: string[];
        let lineMap: number[];
        before(() => {
            testContent = `in this story:
the lazy brown fox
jumped over the cow
that ate the grass
that was purple at the tips
and grew 1cm per day`;

            ({ lines, lineMap } = server.LineIndex.linesFromText(testContent));
            assert.isTrue(lines.length > 0, "Failed to initialize test text. Expected text to have at least one line");

            const lineIndex = new server.LineIndex();
            lineIndex.load(lines);

            validateEditAtPosition = (position: number, deleteLength: number, insertString: string) => {
                validateEdit(lineIndex, testContent, position, deleteLength, insertString);
            };
        });

        after(() => {
            validateEditAtPosition = undefined;
            testContent = undefined;
            lines = undefined;
            lineMap = undefined;
        });

        it(`Insert at end of file`, () => {
            validateEditAtPosition(testContent.length, 0, "hmmmm...\r\n");
        });

        it(`Unusual line endings merge`, () => {
            validateEditAtPosition(lines[0].length - 1, lines[1].length, "");
        });

        it(`Delete whole line and nothing but line (last line)`, () => {
            validateEditAtPosition(lineMap[lineMap.length - 2], lines[lines.length - 1].length, "");
        });

        it(`Delete whole line and nothing but line (first line)`, () => {
            validateEditAtPosition(0, lines[0].length, "");
        });

        it(`Delete whole line (first line) and insert with no line breaks`, () => {
            validateEditAtPosition(0, lines[0].length, "moo, moo, moo! ");
        });

        it(`Delete whole line (first line) and insert with multiple line breaks`, () => {
            validateEditAtPosition(0, lines[0].length, "moo, \r\nmoo, \r\nmoo! ");
        });

        it(`Delete multiple lines and nothing but lines (first and second lines)`, () => {
            validateEditAtPosition(0, lines[0].length + lines[1].length, "");
        });

        it(`Delete multiple lines and nothing but lines (second and third lines)`, () => {
            validateEditAtPosition(lines[0].length, lines[1].length + lines[2].length, "");
        });

        it(`Insert multiple line breaks`, () => {
            validateEditAtPosition(21, 1, "cr...\r\ncr...\r\ncr...\r\ncr...\r\ncr...\r\ncr...\r\ncr...\r\ncr...\r\ncr...\r\ncr...\r\ncr...\r\ncr");
        });

        it(`Insert multiple line breaks`, () => {
            validateEditAtPosition(21, 1, "cr...\r\ncr...\r\ncr");
        });

        it(`Insert multiple line breaks with leading \\n`, () => {
            validateEditAtPosition(21, 1, "\ncr...\r\ncr...\r\ncr");
        });

        it(`Single line no line breaks deleted or inserted, delete 1 char`, () => {
            validateEditAtPosition(21, 1, "");
        });

        it(`Single line no line breaks deleted or inserted, insert 1 char`, () => {
            validateEditAtPosition(21, 0, "b");
        });

        it(`Single line no line breaks deleted or inserted, delete 1, insert 2 chars`, () => {
            validateEditAtPosition(21, 1, "cr");
        });

        it(`Delete across line break (just the line break)`, () => {
            validateEditAtPosition(21, 22, "");
        });

        it(`Delete across line break`, () => {
            validateEditAtPosition(21, 32, "");
        });

        it(`Delete across multiple line breaks and insert no line breaks`, () => {
            validateEditAtPosition(21, 42, "");
        });

        it(`Delete across multiple line breaks and insert text`, () => {
            validateEditAtPosition(21, 42, "slithery ");
        });
    });

    describe(`VersionCache stress test`, () => {
        let rsa: number[] = [];
        let la: number[] = [];
        let las: number[] = [];
        let elas: number[] = [];
        let ersa: number[] = [];
        let ela: number[] = [];
        const iterationCount = 20;
        // const iterationCount = 20000; // uncomment for testing
        let lines: string[];
        let lineMap: number[];
        let lineIndex: server.LineIndex;
        let testContent: string;

        before(() => {
            // Use scanner.ts, decent size, does not change frequently
            const testFileName = "src/compiler/scanner.ts";
            testContent = Harness.IO.readFile(testFileName);
            const totalChars = testContent.length;
            assert.isTrue(totalChars > 0, "Failed to read test file.");

            ({ lines, lineMap } = server.LineIndex.linesFromText(testContent));
            assert.isTrue(lines.length > 0, "Failed to initialize test text. Expected text to have at least one line");

            lineIndex = new server.LineIndex();
            lineIndex.load(lines);

            let etotalChars = totalChars;

            for (let j = 0; j < 100000; j++) {
                rsa[j] = Math.floor(Math.random() * totalChars);
                la[j] = Math.floor(Math.random() * (totalChars - rsa[j]));
                if (la[j] > 4) {
                    las[j] = 4;
                }
                else {
                    las[j] = la[j];
                }
                if (j < 4000) {
                    ersa[j] = Math.floor(Math.random() * etotalChars);
                    ela[j] = Math.floor(Math.random() * (etotalChars - ersa[j]));
                    if (ela[j] > 4) {
                        elas[j] = 4;
                    }
                    else {
                        elas[j] = ela[j];
                    }
                    etotalChars += (las[j] - elas[j]);
                }
            }
        });

        after(() => {
            rsa = undefined;
            la = undefined;
            las = undefined;
            elas = undefined;
            ersa = undefined;
            ela = undefined;
            lines = undefined;
            lineMap = undefined;
            lineIndex = undefined;
            testContent = undefined;
        });

        it("Range (average length 1/4 file size)", () => {
            for (let i = 0; i < iterationCount; i++) {
                const s2 = lineIndex.getText(rsa[i], la[i]);
                const s1 = testContent.substring(rsa[i], rsa[i] + la[i]);
                assert.equal(s1, s2);
            }
        });

        it("Range (average length 4 chars)", () => {
            for (let j = 0; j < iterationCount; j++) {
                const s2 = lineIndex.getText(rsa[j], las[j]);
                const s1 = testContent.substring(rsa[j], rsa[j] + las[j]);
                assert.equal(s1, s2);
            }
        });

        it("Edit (average length 4)", () => {
            for (let i = 0; i < iterationCount; i++) {
                const insertString = testContent.substring(rsa[100000 - i], rsa[100000 - i] + las[100000 - i]);
                const snapshot = lineIndex.edit(rsa[i], las[i], insertString);
                const checkText = editFlat(rsa[i], las[i], insertString, testContent);
                const snapText = snapshot.getText(0, checkText.length);
                assert.equal(checkText, snapText);
            }
        });

        it("Edit ScriptVersionCache ", () => {
            const svc = server.ScriptVersionCache.fromString(<server.ServerHost>ts.sys, testContent);
            let checkText = testContent;

            for (let i = 0; i < iterationCount; i++) {
                const insertString = testContent.substring(rsa[i], rsa[i] + las[i]);
                svc.edit(ersa[i], elas[i], insertString);
                checkText = editFlat(ersa[i], elas[i], insertString, checkText);
                if (0 == (i % 4)) {
                    const snap = svc.getSnapshot();
                    const snapText = snap.getText(0, checkText.length);
                    assert.equal(checkText, snapText);
                }
            }
        });

        it("Edit (average length 1/4th file size)", () => {
            for (let i = 0; i < iterationCount; i++) {
                const insertString = testContent.substring(rsa[100000 - i], rsa[100000 - i] + la[100000 - i]);
                const snapshot = lineIndex.edit(rsa[i], la[i], insertString);
                const checkText = editFlat(rsa[i], la[i], insertString, testContent);
                const snapText = snapshot.getText(0, checkText.length);
                assert.equal(checkText, snapText);
            }
        });

        it("Line/offset from pos", () => {
            for (let i = 0; i < iterationCount; i++) {
                const lp = lineIndex.charOffsetToLineNumberAndPos(rsa[i]);
                const lac = ts.computeLineAndCharacterOfPosition(lineMap, rsa[i]);
                assert.equal(lac.line + 1, lp.line, "Line number mismatch " + (lac.line + 1) + " " + lp.line + " " + i);
                assert.equal(lac.character, (lp.offset), "Charachter offset mismatch " + lac.character + " " + lp.offset + " " + i);
            }
        });

        it("Start pos from line", () => {
            for (let i = 0; i < iterationCount; i++) {
                for (let j = 0; j < lines.length; j++) {
                    const lineInfo = lineIndex.lineNumberToInfo(j + 1);
                    const lineIndexOffset = lineInfo.offset;
                    const lineMapOffset = lineMap[j];
                    assert.equal(lineIndexOffset, lineMapOffset);
                }
            }
        });
    });
}
