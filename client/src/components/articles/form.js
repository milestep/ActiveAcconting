import React, { Component, PropTypes } from 'react';
import { connect }                     from 'react-redux';
import { bindActionCreators }          from 'redux';
import { actions as articleActions }   from '../../resources/article';
import FormInput                       from '../layout/form/input';
import FormSelect                      from '../layout/form/select';
import extractPropertyFromObject       from '../../utils/extractPropertyFromObject';

export default class ArticleForm extends Component {
  constructor(props) {
    super(props);

    const { article, types } = props;
    // const { type, title } = article;

    this.articleState = {
      title: {
        value: (article && article.title) ? article.title : '',
        blured: false,
      },
      type: {
        value: (article && article.type) ? {
          value: article.type,
          label: article.type
        } : {
          value: types[0],
          label: types[0]
        },
        blured: false,
      }
    };

    this.state = {
      article: this.articleState,
      canSubmit: true
    };

    this.handleChange = this.handleChange.bind(this);
  }

  handleSubmit = model => {
    const { article } = this.props;
    let articleValues = extractPropertyFromObject(this.state.article, 'value');

    if (article) {
      articleValues = Object.assign({}, article, articleValues);
    }

    this.props.handleSubmit(articleValues)
      .then(res => {
        if (this.refs.form) {
          this.setState({
            article: this.articleState
          });

          this.resetForm();
        }
      });
  }

  handleChange = (field, values) => {
    this.setState((prevState) => ({
      article: {
        ...prevState.article,
        [field]: {
          ...prevState.article[field],
          ...values
        }
      }
    }));
  }

  toggleButton = (status) => {
    this.setState({
      canSubmit: status
    });
  }

  resetForm() {
    this.refs.form.reset();
  }

  render() {
    const { title, type } = this.state.article;
    const { fetching, editing, types } = this.props;
    const buttonCaption = editing ? 'Update' : 'Create Article';

    const typeOptions = types.map((type, i) => {
      return {
        value: type,
        label: type
      }
    });

    return(
      <Formsy.Form 
        ref="form"
        onValidSubmit={this.handleSubmit} 
        onValid={this.toggleButton.bind(this, true)} 
        onInvalid={this.toggleButton.bind(this, false)}
        className="articleForm"
      >
        <FormInput
          title="Title"
          name="title"
          label={editing ? false : true}
          value={title.value}
          inputClassName={editing ? "input-sm" : false}
          isBlured={title.blured}
          handleChange={this.handleChange}
          validationErrors={editing ? false : {
            isRequired: "Title is required"
          }}
          required
        />

        <FormSelect 
          title="Type"
          name="type"
          label={editing ? false : true}
          value={type.value}
          selectClassName={editing ? "select-sm" : false}
          isBlured={type.blured}
          options={typeOptions}
          handleChange={this.handleChange}
          validationErrors={editing ? false : {
            isRequired: "Type is required"
          }}
          required
        />

        <button 
          type="submit" 
          className={`btn btn-success${editing ? ' btn-sm' : ''}`}
          disabled={!this.state.canSubmit || fetching}
        >
          { fetching ?
            <span className="spin-wrap">
              <span>{buttonCaption}</span>
              <i class="fa fa-circle-o-notch fa-spin"></i>
            </span> 
            : buttonCaption
          }
        </button>
      </Formsy.Form>
    );
  }
}
