export default class Schema {
  static state = {
    items: {
      revenue: { values: [], articles: [] },
      cost: { values: [], articles: [] }
    },
    average: { cost: 0, revenue: 0, profit: 0 },
    total: { cost: 0, revenue: 0, profit: 0 },
    profit: { values: [] }
  }

  article() {
    var { initialValues } = this.props

    return {
      item: this.props.article,
      values: _.cloneDeep(initialValues),
      counterparties: [this.counterparty()]
    }
  }

  counterparty(values) {
    var { initialValues } = this.props

    return {
      item: this.props.counterparty || {name: ' - '},
      values: _.cloneDeep(initialValues)
    }
  }

  value(value) {
    const { currentFilter } = this.props
    return { item: currentFilter, value }
  }

  filter(item, value = 0) {
    return { item, value }
  }

  setCurrentValues(newProps) {
    this.props = newProps
  }
}
