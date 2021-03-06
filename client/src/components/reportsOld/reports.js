import React, { Component, PropTypes }    from 'react'
import { bindActionCreators }             from 'redux'
import { connect }                        from 'react-redux'
import Select                             from 'react-select'
import { toaster }                        from '../../actions/alerts';
import { actions as subscriptionActions } from '../../actions/subscriptions'
import { actions as workspaceActions }    from '../../actions/workspaces'
import { index as fetchRegisters }        from '../../actions/registers'
import { setStatePromise, pushUnique}     from '../../utils'
import ArticlesList                       from './articlesList'
import MonthsTabs                         from './monthsTabs'
import moment                             from 'moment';
import ReactHTMLTableToExcel              from 'react-html-table-to-excel';
import Workbook                           from 'react-excel-workbook'

const monthsNames = moment.monthsShort()

@connect(state => ({
  registers: state.registers.items,
  articles: state.articles.items,
  counterparties: state.counterparties.items,
  filter_years: state.registers.years,
  nextWorkspace: state.workspaces.app.next,
  isResolved: {
    articles: state.subscriptions.articles.resolved,
    counterparties: state.subscriptions.counterparties.resolved
  }
}), dispatch => ({
  actions: bindActionCreators({
    ...subscriptionActions,
    ...workspaceActions,
    toaster,
    fetchRegisters
  }, dispatch)
}))
export default class ReportsOld extends Component {
  static propTypes = {
    registers: PropTypes.array.isRequired,
    articles: PropTypes.array.isRequired,
    counterparties: PropTypes.array.isRequired,
    filter_years: PropTypes.array.isRequired,
    nextWorkspace: PropTypes.object.isRequired,
    isResolved: PropTypes.object.isRequired
  }

  constructor(props) {
    super(props)

    this.types = ['Revenue', 'Cost']
    this.subscriptions = ['articles', 'counterparties']
    this.toaster = props.actions.toaster()
    this.state = this.createInitialState()
  }

  createInitialState() {
    const date = new Date(),
          year = date.getFullYear(),
          month = date.getMonth()

    return {
      isError: false,
      isStateReady: false,
      current: { year, month: [month] },
      report: {
        Revenue: {},
        Cost: {}
      },
      available: {
        years: [ year ]
      },
      profit: {
        common: {},
        Revenue: {},
        Cost: {}
      },
      totalProfit: {
        common: 0,
        Revenue: 0,
        Cost: 0
      },
      collapsedArticles: {
        Revenue: [],
        Cost: []
      },
        display_total: false,
        display_avg: false,
    }

    this.totalPrint = this.totalPrint.bind(this);
    this.avgPrint = this.avgPrint.bind(this);
  }

  componentWillMount() {
    this.props.actions.fetchRegisters(this.state.current)
      .then(() => {
        this.props.actions.subscribe(this.subscriptions)
          .then(() => {
            if (this.props.registers.length === 0) {
              this.toaster.warning('There is no data for reports')
            }
            this.createReportState()
          })
          .catch(err => this.handleSubscriptionsError(err))
      })
  }

  componentWillReceiveProps() {
    if (this.isNextWorkspaceChanged()) {
      this.props.actions.fetchRegisters(this.state.current)
        .then(() => {
          this.createReportState()
        })
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.isStateReady || nextState.isError) return true
    if (this.isNextWorkspaceChanged()) return true
    return false
  }

  componentWillUnmount() {
    this.props.actions.unsubscribe(this.subscriptions)
  }

  isNextWorkspaceChanged() {
    return this.props.actions.isNextWorkspaceChanged(this.props.nextWorkspace.id)
  }

  createReportState() {
    const fakeState = this.createInitialState()
    const { registers, articles } = this.props
    const { current } = this.state

    let { report, profit, totalProfit } = fakeState
    let { years, months } = fakeState.available

    const currentTitlesMonths = []
    current.month.forEach(numMonth => currentTitlesMonths[monthsNames[numMonth]] = 0)

    for(let model in profit) {
      profit[model] =  Object.assign({}, currentTitlesMonths)
    }

    registers.forEach(register => {
      const registerDate = new Date(register.date),
            registerMonth = registerDate.getMonth()

      const article = Object.assign({}, articles.find(article => article.id === register.article_id))
      const reportType = report[article.type]
      const articleTitle = article.title
      let fakeCurrentTitlesMonths = Object.assign({}, currentTitlesMonths)
      let counterpartyName = this.findRegisterCounterparty(register)

      profit[article.type][monthsNames[registerMonth]] += register.value
      profit['common'][monthsNames[registerMonth]] += this.getRegisterValue(article.type, register.value)
      totalProfit[article.type] += register.value
      totalProfit['common'] += this.getRegisterValue(article.type, register.value)

      if (reportType[articleTitle]) {
        if (reportType[articleTitle]['counterparties'][counterpartyName]) {
          reportType[articleTitle]['counterparties'][counterpartyName][monthsNames[registerMonth]] += register.value
        } else {
          fakeCurrentTitlesMonths[monthsNames[registerMonth]] = register.value
          reportType[articleTitle]['counterparties'][counterpartyName] = fakeCurrentTitlesMonths
        }
      } else {
        reportType[articleTitle] = {}
        reportType[articleTitle]["counterparties"] = {}
        fakeCurrentTitlesMonths[monthsNames[registerMonth]] = register.value
        reportType[articleTitle]["counterparties"][counterpartyName] = fakeCurrentTitlesMonths
      }
    })

    for(let model in report) {
      for(let articleTitle in report[model]) {
        report[model][articleTitle]['values'] = Object.assign({}, currentTitlesMonths)

        for(let counterpartyName in report[model][articleTitle]['counterparties']) {
          for(let month in report[model][articleTitle]['counterparties'][counterpartyName]) {
            report[model][articleTitle]['values'][month] += report[model][articleTitle]['counterparties'][counterpartyName][month]
          }
        }
      }
    }

    this.setState((prevState) => ({
      ...prevState,
      report,
      profit,
      totalProfit,
      isStateReady: true,
      available: {
        years: this.props.filter_years
      }
    }))
  }

  findRegisterCounterparty(register) {
    const { counterparties } = this.props
    let counterpartyName =  register.counterparty_id ? counterparties
        .find(counterparty => counterparty.id === register.counterparty_id) : { name: '-' }

    return counterpartyName.name
  }

  getRegisterValue(type, value) {
    return type == 'Cost' ? -value : value
  }

  handleSubscriptionsError(error) {
    const { available } = this.createInitialState()

    this.setState((prevState) => ({
      ...prevState,
      isError: true,
      isStateReady: false,
      available
    }))
  }

  handleYearChange = e => {
    if (this.state.isError) return

    const year = e.value

    setStatePromise(this, (prevState => ({
      current: {
        ...prevState.current, year
      }
    }))).then(() => {
      this.props.actions.fetchRegisters(this.state.current)
        .then(() => {
          this.createReportState()
        })
    })
  }

  handleMonthChange = month => {
    if (this.state.isError) return
    let currentMonths = Object.assign([], this.state.current.month)
    let index = currentMonths.indexOf(month)

    if (index != -1)
      currentMonths.splice([index], 1)
    else
      currentMonths.push(month)

    setStatePromise(this, (prevState => ({
      current: {
        ...prevState.current, month: currentMonths.sort((a, b) => a - b)
      }
    }))).then(() => {
      this.props.actions.fetchRegisters(this.state.current)
        .then(() => {
          this.createReportState()
        })
    })
  }

  handleArticleChange = (id, type) => {
    if (this.state.isError) return

    this.setState((prevState) => {
      const { collapsedArticles } = prevState
      const index = collapsedArticles[type].indexOf(id)
      let newCollapsedArticles = collapsedArticles[type].slice()

      if (index > -1) {
        newCollapsedArticles.splice(index, 1)
      } else {
        newCollapsedArticles.push(id)
      }

      return { collapsedArticles: {
        ...collapsedArticles,
        [type]: newCollapsedArticles
      } }
    })
  }

  totalPrint(){
    this.setState((prevState) => ({
      display_total: !prevState.display_total
    }));
  }

  avgPrint(){
    this.setState((prevState) => ({
      display_avg: !prevState.display_avg
    }));
  }


  printCurrentMonths() {
    const { current } = this.state

    const monthsNames = moment.monthsShort()
    let printCurrentMonths = [];

    monthsNames.forEach((month, index) => {
      const isCurrent = current.month.includes(monthsNames.indexOf(month))

      if (isCurrent) {
        printCurrentMonths.push(
          <div className='col-xs-1' key={month}>
            { month }
          </div>
        )
      }
    });

    return printCurrentMonths
  }

  profitValues(months) {
    let res = [];

    for(let month in months) {
      res.push( <div key={month} className={'col-xs-1'}>{ months[month] }</div> )
    }

    return res
  }

  printValues(value) {
    const { report, profit, totalProfit, current, available, collapsedArticles } = this.state
    let printTotal = current.month.length
    return  printTotal ? parseFloat(totalProfit[value] / this.printCurrentMonths().length).toFixed(0) : null
  }

  fetchClassName(display_total, display_avg) {
    let className
    if (display_total && !display_avg || !display_total && display_avg){
      className = 'col-xs-9'
    }
    else if (display_total && display_avg){
      className = 'col-xs-8'
    }
    else{
      className = 'col-xs-10'
    }
    return className
  }


  render() {
    const { report, profit, totalProfit, current, available, collapsedArticles } = this.state
    let printTotal = current.month.length
    if (!this.state.isStateReady && !this.state.isError) {
      return(
        <span className='spin-wrap main-loader'>
          <i class='fa fa-spinner fa-spin fa-3x'></i>
        </span>
      )
    }

    const monthsNames = moment.monthsShort()
    const months = current.month.map((month, i)=>{
      return(<th key={i}>{monthsNames[month]}</th>)
    })
    const revenue = this.profitValues(profit['Revenue']).map((reven)=>{
      return(<td key={reven.id}>{reven}</td>)
    })
    const cost = this.profitValues(profit['Cost']).map((cost)=>{
      return(<td key={cost.id}>{cost}</td>)
    })
    const common = this.profitValues(profit['common']).map((common)=>{
      return(<td key={common.id}>{common}</td>)
    })
      return(
        <div>
          <div>
            <ReactHTMLTableToExcel
              id="test-table-xls-button"
              className="btn btn-xls-button pull-right"
              table="table-to-xls"
              filename="tablexls"
              sheet="tablexls"
              buttonText="Download as XLS"/>
              <table id="table-to-xls" className='displayNone'>
                <tr>
                  <th>Month Names</th>
                  <th>{current.year}</th>
                  {months}
                </tr>
                <tr>
                  <td>Revenue</td>
                  <td> { revenue }</td>
                </tr>
                 <tr>
                  <td>Cost</td>
                  <td> { cost }</td>
                </tr>
                <tr>
                  <td>Profit</td>
                  <td>{ common }</td>
                </tr>
              </table>
          </div>
        <div className='row'>
          <div className='reports-filter'>
            <div className='reports-filter-block'>
              <Select
                name='years'
                className='reports-filter-select'
                onChange={this.handleYearChange.bind(this)}
                options={available.years.map(year => ({ value: year, label: year.toString() }))}
                value={current.year}
              />
            </div>
            <div className='reports-filter-block'>
              <MonthsTabs
                current={current.month}
                handleMonthChange={this.handleMonthChange.bind(this)}
              />
            </div>
          </div>
        </div>

        <hr />

        <div className="pull-right col-xs-2">
          <div className='btntotal'>
            <input type="checkbox" id="totalbtn" onClick={this.totalPrint.bind(this)}/>
            <label for="totalbtn">Total</label>
          </div>
          <div className='btnavg'>
            <input type="checkbox" id="avgbtn" className='avg' onClick={this.avgPrint.bind(this)} />
            <label for="avgbtn">AVG</label>
          </div>
        </div>
        <div className="clearfix"></div>
        <div className='reports-list'>
          <div className='fake-panel'>
            <div className='row reports-list-align-right'>
              <div className={` col-md-offset-2 ${this.fetchClassName(this.state.display_total, this.state.display_avg)}`}>
                <div className='reports-list-months'>
                  {this.printCurrentMonths()}
                </div>
              </div>
              <div className={`col-xs-1 ${!this.state.display_total ? 'display_none' : 'display_block'}`}>
                  <b>Total</b>
                </div>
                <div className={`col-xs-1 ${!this.state.display_avg ? 'display_none' : 'display_block'} `}>
                  <b>AVG</b>
                </div>
            </div>
          </div>

          <div className='row'>
            <div className='col-xs-12'>
              <div className='fake-panel'>
                <div className='row reports-list-heading'>
                  <h4 className='col-xs-2 reports-list-title'>Revenue</h4>
                  <div className={` reports-list-value reports-list-align-right ${this.fetchClassName(this.state.display_total, this.state.display_avg)}`}>
                    { this.profitValues(profit['Revenue']) }
                  </div>

                  <div className={`col-xs-1 reports-list-value reports-list-align-right ${this.state.display_total ? 'display_block' : 'display_none'}`} >
                    <b>{printTotal ? totalProfit['Revenue'] : null }</b>
                  </div>
                  <div className={`col-xs-1 reports-list-value reports-list-align-right ${this.state.display_avg ? 'display_block' : 'display_none'}`}>
                    <b>{this.printValues('Revenue')}</b>
                  </div>
                </div>
              </div>

              <ArticlesList
                currentMonths={current.month}
                displayTotal={this.state.display_total}
                displayAvg={this.state.display_avg}
                type='Revenue'
                articles={report['Revenue']}
                collapsedArticles={collapsedArticles['Revenue']}
                handleArticleChange={this.handleArticleChange.bind(this)}
                fetchClassName = {this.fetchClassName.bind(this)}
              />
            </div>
          </div>

          <div className='row'>
            <div className='col-xs-12'>
              <div className='fake-panel'>
                <div className='row reports-list-heading'>
                  <h4 className='col-xs-2 reports-list-title'>Cost</h4>
                  <div className={`reports-list-value reports-list-align-right ${this.fetchClassName(this.state.display_total, this.state.display_avg)}`}>
                    { this.profitValues(profit['Cost']) }
                  </div>
                  <div className={`col-xs-1 reports-list-value reports-list-align-right ${this.state.display_total ? 'display_block' : 'display_none'}`} >
                    <b>{ printTotal ? totalProfit['Cost'] : null }</b>
                  </div>
                  <div className={`col-xs-1 reports-list-value reports-list-align-right ${this.state.display_avg ? 'display_block' : 'display_none'}`}>
                    <b>{this.printValues('Cost')}</b>
                  </div>
                </div>
              </div>

              <ArticlesList
                currentMonths={current.month}
                displayTotal={this.state.display_total}
                displayAvg={this.state.display_avg}
                type='Cost'
                articles={report['Cost']}
                collapsedArticles={collapsedArticles['Cost']}
                handleArticleChange={this.handleArticleChange.bind(this)}
                fetchClassName = {this.fetchClassName.bind(this)}
              />
            </div>
          </div>

          <div className='row'>
            <div className='col-xs-12'>
              <div className='fake-panel'>
                <div className='row reports-list-heading profit'>
                  <h4 className='col-xs-2 reports-list-title'>Profit</h4>
                  <div className={` reports-list-value reports-list-align-right ${this.fetchClassName(this.state.display_total, this.state.display_avg)}`}>
                    { this.profitValues(profit['common']) }
                  </div>
                  <div className={`col-xs-1 reports-list-value reports-list-align-right ${this.state.display_total ? 'display_block' : 'display_none'}`} >
                    <b>{ printTotal ? totalProfit['common'] : null }</b>
                  </div>
                  <div className={`col-xs-1 reports-list-value reports-list-align-right pull-right ${this.state.display_avg ? 'display_block' : 'display_none'}`}>
                    <b>{this.printValues('common')}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
