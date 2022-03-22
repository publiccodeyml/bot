# Vote results

The results of [the vote]({{ vote_comment_link }}) are:

|Vote|Members|Votes count|Percentage|
|-|-|-|-|
|:+1: Approve | {{ vote_thumbs_ups_tags }}   | {{ vote_thumbs_ups_count }}   | {{ vote_thumbs_ups_percentage }}   |
|:-1: Reject  | {{ vote_thumbs_downs_tags }} | {{ vote_thumbs_downs_count }} | {{ vote_thumbs_downs_percentage }} |

{{ result_message }}

<details>
  <summary><sub>Details<sub></summary>
  <br>
  <p>
    {{ vote_details_notes }}
  </p>
  <p>
    The following users voted (includes non-members of the steering committee):
  </p>

  {{ vote_details_users }}
</details>
