import _                 from 'lodash'
import { ActionCreator } from './reducer'
import * as constants    from './constants'

const { SET_FILTERS } = constants

export default class Filter {
  constructor(props) {
    this.name      = props.name
    this.dispatch = props.dispatch
    this.getState = props.getState
    this._strategy = props.strategy

    this._strategy.setFilter(this)

    this.createActions()
    this.initializeFilters()
  }

  createActions() {
    var { createAction } = new ActionCreator({
      name: this.name,
      dispatch: this.dispatch
    })

    this.actions = {
      setFilters: createAction(SET_FILTERS)
    }
  }

  initializeFilters() {
    const strategy = this._strategy

    this.setFilters({
      default: strategy.defaultFilters(),
      component: strategy.componentFilters()
    })
  }

  getFilters() {
    var store = this.getState()
    return store.filters[this.name]
  }

  getDefaultFilters() {
    return this.getFilters().default
  }

  getComponentFilters() {
    return this.getFilters().component
  }

  getAppliedFilters() {
    var filters = this.getFilters()
    var appliedFilters = []

    filters.component.forEach(filter => {
      if (filter.applied != true) return
      appliedFilters.push(filter.value)
    })

    return _.assign({}, filters.default, {
      [this._strategy.filterBy]: appliedFilters
    })
  }

  setFilters() {
    var newFilters = {}
    var arg = arguments[0]
    var filters = (_.isFunction(arg) ?
                  arg.call(this, this.getFilters()) :
                  arg) || null

    if (!filters) return

    if (filters.hasOwnProperty('default')) {
      newFilters['default'] = filters['default'] || null
    }

    if (filters.hasOwnProperty('component')) {
      this._checkComponentFilters(filters['component'])
      newFilters['component'] = filters['component']
    }

    this.actions.setFilters(newFilters)
  }

  emitEvent(eventName) {
    var strategy = this._strategy
    var handler = strategy[eventName]

    if (!handler) return false

    handler.call(strategy)
  }

  getStrategy() {
    return this._strategy
  }

  _checkComponentFilters(filters) {
    if (!filters || !filters.length) {
      throw new Error("'componentFilter' must be present")
    } else if (!_.isArray(filters)) {
      throw new Error("'componentFilter' must be an array")
    }
  }
}