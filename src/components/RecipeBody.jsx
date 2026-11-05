// A recipe's ingredients (what's in storage, pantry extras, everything else)
// and steps. Shared by the recipe list and the online search preview.
function Line({ item, have }) {
  return (
    <li className={have === true ? 'have' : have === false ? 'need' : 'other'}>
      <span className="mark">{have === true ? '✓' : have === false ? '○' : '·'}</span>
      <span>
        <strong>{item.name}</strong>
        {item.amount && <> — {item.amount}</>}
        {item.as && <> ({item.as})</>}
        {item.optional && ' (optional)'}
      </span>
    </li>
  )
}

export default function RecipeBody({ recipe, status }) {
  const s = status
  return (
    <>
      <div className="recipe-cols">
        <div>
          <h4>From your storage</h4>
          {s.storage.length ? (
            <ul className="ingredients">{s.storage.map((i) => <Line key={i.id} item={i} have={i.have} />)}</ul>
          ) : <p className="hint">None</p>}
        </div>
        <div>
          <h4>Pantry extras</h4>
          {s.extras.length ? (
            <ul className="ingredients">{s.extras.map((i) => <Line key={i.id} item={i} have={i.have} />)}</ul>
          ) : <p className="hint">None</p>}
        </div>
      </div>
      {s.others.length > 0 && (
        <>
          <h4>Other ingredients</h4>
          <ul className="ingredients">
            {s.others.map((i, n) => <Line key={n} item={i} have={null} />)}
          </ul>
        </>
      )}
      {recipe.steps?.length > 0 && (
        <>
          <h4>Steps</h4>
          <ol className="steps">
            {recipe.steps.map((step, n) => <li key={n}>{step}</li>)}
          </ol>
        </>
      )}
      {recipe.tip && <p className="hint">{recipe.tip}</p>}
      {recipe.source && (
        <p className="hint">
          From <a href={recipe.source.url} target="_blank" rel="noreferrer">{recipe.source.name}</a>
          {recipe.source.original && <> · <a href={recipe.source.original} target="_blank" rel="noreferrer">original recipe</a></>}
          . Fresh ingredients are matched to your stored ones — rehydrate dried carrots and onions,
          and mix dry milk with water.
        </p>
      )}
    </>
  )
}
