import Schema  from './schema'
import _       from 'lodash'

export class ReportsStateCreator {
  constructor(props) {
    this.props    = props.models
    this.strategy = props.strategy
    this.schema   = new Schema(this.strategy)
    this.state    = this.schema.state()
    this.current  = {}
  }

  eachRegister(callback) {
    var { registers, articles, counterparties } = this.props

    registers.forEach(register => {
      const articleId = register.article_id,
            countId = register.counterparty_id

      const article = this.search(articles, articleId),
            counterparty = this.search(counterparties, countId),
            articleType = article.type.toLowerCase(),
            { value } = register,
            valueAbs = (articleType == 'revenue' ? value : -value)

      const localStorage = this.state.items[articleType]
      const currentFilter = this.strategy.getCurrentFilterByDate(register.date)

      const localArticle = this.searchItem(localStorage.articles, articleId)
      const localCounterparty = localArticle ?
            this.searchItem(localArticle.counterparties, countId) : null

      this.current = {
        article, counterparty,
        localArticle, localCounterparty,
        localStorage, currentFilter,
        value, valueAbs, type: articleType
      }

      this.schema.setCurrentValues(this.current)
      callback(this.current)
    })
  }

  generateState() {
    this.eachRegister(current => {
      const { localStorage, value, valueAbs } = current

      this.incrementTotalValue()
      this.incrementLocalValue(this.state.profit, valueAbs)
      this.incrementLocalValue(localStorage, value)

      this.mergeArticles()
    })

    this.setTotalProfitValue()
    this.setAverageValues()

    console.log(this.state)
  }

  mergeArticles() {
    const { localArticle, localStorage, value } = this.current

    if (!localArticle) {
      localStorage.articles.push(this.schema.article())
    } else {
      this.incrementLocalValue(localArticle, value)
      this.mergeCounterparties()
    }
  }

  mergeCounterparties() {
    const { localArticle, localCounterparty, value } = this.current

    if (!localCounterparty) {
      localArticle.counterparties.push(this.schema.counterparty())
    } else {
      this.incrementLocalValue(localCounterparty, value)
    }
  }

  /*
   * Helpers for values
   */
  setTotalProfitValue() {
    var { total } = this.state
    total.profit = total.revenue - total.cost
  }

  setAverageValues() {
    var { total, average } = this.state,
        appliedFilters = this.strategy.getPrimaryAppliedFilters(),
        appliedLength = appliedFilters.length,
        newAverage = {}

    for (var type in average) {
      var value = total[type] / appliedLength
      newAverage[type] = Math.ceil(value)
    }

    this.state.average = newAverage
  }

  incrementTotalValue() {
    const { type, value } = this.current
    this.state.total[type] += value
  }

  incrementLocalValue(storage, value) {
    var localValue = this.searchLocalValue(storage)

    if (!localValue) {
      storage.values.push(this.schema.value(value))
    } else {
      localValue.value += value
    }
  }

  searchLocalValue(storage) {
    const { currentFilter } = this.current
    return storage.values.find(filter => (
      filter.item.value == currentFilter.value
    ))
  }

  /*
   * Class Helpers
   */
  search(storage, value, item = false) {
    if (!storage.length) return

    return storage.find(obj => {
      var objValue = item ? obj.item : obj
      return objValue['id'] == value
    })
  }

  searchItem(storage, value) {
    return this.search(storage, value, true)
  }
}
