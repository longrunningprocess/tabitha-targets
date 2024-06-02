import {Database} from 'bun:sqlite'

// usage: `bun migrate.js English.YYYY-MM-DD.mdb.sqlite Targets.YYYY-MM-DD.tabitha.sqlite`
const tbta_db_name = Bun.argv[2] // English.YYYY-MM-DD.mdb.sqlite
const language = tbta_db_name.split('.')[0] // English
const targets_db_name = Bun.argv[3] // Targets.YYYY-MM-DD.tabitha.sqlite

console.log(`Creating Text table in ${targets_db_name}...`)
const targets_db = new Database(targets_db_name)
targets_db.query(`
	CREATE TABLE IF NOT EXISTS Text (
		language	TEXT,
		book 		TEXT,
		chapter 	INTEGER,
		verse 	INTEGER,
		text 		TEXT
	)
`).run()
console.log('done.')


console.log(`Extracting table names from ${tbta_db_name}...`)
const tbta_db = new Database(tbta_db_name)
// https://bun.sh/docs/api/sqlite#reference
const target_tablenames_tbta = tbta_db.query(`
	SELECT *
	FROM sqlite_master
	WHERE type = 'table'
		AND name like 'Target_EB_%'
`).all().map(({name}) => name)
console.log('done.')

console.log(`Transforming data from ${tbta_db_name}...`)
const transformed_data = target_tablenames_tbta.map(table_name => tbta_db.query(`
		SELECT Reference, Verse
		FROM ${table_name}
		WHERE Reference NOT NULL
	`).all().map(transform) // array of books
).flat() // flattens all 66 books into one array of all verses

function transform ({Reference, Verse}) {
	// References are expected to look like this: "Daniel 3:9"
	const [, book, chapter, verse] = /(.*) (\d+):(\d+)/.exec(Reference)

	// Verse looks like this: "Those astrologers said to King Nebuchadnezzar, “May you, the king, live forever!~!~(NP those[Pre-Nominal] astrologer+s[Plural] ) (VP said ) (NP to (NP _ King ) Nebuchadnezzar ) [ ,_“ (VP may[CP-VP] ) (NP you (NP , the[Pre-Nominal] king , ) ) (VP live ) (AdvP forever ) ! ] . Those astrologers said to King Nebuchadnezzar, “May you, the king, live forever! Those astrologers said to the king, “We hope that you'll live forever.~!~(NP those[Pre-Nominal] astrologer+s[Plural] ) (VP said ) (NP to the[Pre-Nominal] king ) [ ,_“ (NP we ) (VP hope ) [ that[Complementizer] (NP you ) (VP will[Pre-Verbal] live ) (AdvP forever ) ] ] . "
	// 	note: can also be empty
	const [, text] = /(.*?)~!~/.exec(Verse) ?? [,'']

	return {
		book,
		chapter: Number(chapter),
		verse: Number(verse),
		text,
	}
}
console.log('done.')


console.log(`Cleaning existing data in Text...`)
targets_db.query(`
	DELETE FROM Text
`).run()
console.log('done.')


console.log(`Loading data into Text table...`)
transformed_data.map(async ({book, chapter, verse, text}) => {
	targets_db.query(`
		INSERT INTO Text (language, book, chapter, verse, text)
		VALUES (?, ?, ?, ?, ?)
	`).run(language, book, chapter, verse, text)

	await Bun.write(Bun.stdout, '.')
})
console.log('done.')


console.log(`Optimizing ${targets_db_name}...`)
targets_db.query(`
	VACUUM
`).run()
console.log('done.')
