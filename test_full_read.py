import json
import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path

from full_read import (PROMPT_VERSION, FullReadStore, _locate, attach_unit_reference_warnings,
                       formulation_conflicts, overview_prompt, page_prompt, units_prompt,
                       validate_conflicts, validate_overview, validate_page_result, validate_units)


class FullReadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = sqlite3.connect(Path(self.temp.name) / "test.sqlite", check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)

    def test_formulation_conflicts_convert_units_and_ignore_rich_media(self):
        items = [
            dict(id='P1-I1', page=5, heading='CDML formulation', sourceVerified=True,
                 sourceText='CDML required additional cysteine (12 mM).'),
            dict(id='P2-I1', page=6, heading='CDML formulation', sourceVerified=True,
                 sourceText='Table 2 Cysteine-HCl H2O 0.145 g/L.'),
            dict(id='P3-I1', page=3, sourceVerified=True,
                 sourceText='MYPL rich medium was supplemented with 1% DL-Lactic acid.'),
            dict(id='P4-I1', page=8, heading='CDMA formulation', sourceVerified=True,
                 sourceText='CDMA was made with 50 mM D,L-lactic acid.'),
            dict(id='P5-I1', page=8, heading='CDMA formulation', sourceVerified=True,
                 sourceText='Table 3 DL-Lactic acid 0.6 mM.'),
        ]
        conflicts = {item['quantity']: item for item in formulation_conflicts(items)}
        self.assertEqual(conflicts['CDML cysteine final concentration']['values'], ['12 mM', '0.145 g/L'])
        self.assertEqual(conflicts['CDMA lactate final concentration']['values'], ['50 mM', '0.6 mM'])
        self.assertNotIn('1%', ' '.join(conflicts['CDMA lactate final concentration']['values']))

    def test_location_ignores_incidental_figure_labels_in_long_source(self):
        first = 'The results describe the measured response in the treated group.'
        second = 'The control group was measured under the same conditions.'
        source = first + ' ' + second
        texts = ['a', first, '5', second, 'b']
        page = {'text': ' '.join(texts), 'blocks': [
            {'text': text, 'rect': {'x': n / 10, 'y': .1, 'width': .05, 'height': .05}}
            for n, text in enumerate(texts)]}
        rects, status, indexes = _locate({'sourceText': source}, page)
        self.assertEqual(status, 'located_quote')
        self.assertEqual(indexes, {1, 3})
        self.assertEqual(len(rects), 2)
        # A complete short text can still be located as an exact block match.
        self.assertEqual(_locate({'sourceText': 'a'}, page)[2], {0})

    def test_location_prefers_full_source_over_repeated_figure_caption_ending(self):
        captions = [
            'FIGURE 1: The control response during the harmattan season.',
            'FIGURE 2: The treated response during the harmattan season.',
            'FIGURE 3: The measured concentration during the harmattan season.',
        ]
        page = {'text': '\n'.join(captions), 'blocks': [
            {'text': text, 'rect': {'x': .1, 'y': n / 10, 'width': .8, 'height': .05}}
            for n, text in enumerate(captions)]}
        for n, source in enumerate(captions):
            value = {'sourceText': source, 'startQuote': source[:25], 'endQuote': 'during the harmattan season.'}
            self.assertEqual(_locate(value, page)[2], {n})

    def test_location_full_source_can_span_blocks_without_matching_unrelated_end(self):
        texts = ['Unrelated text ending with the same final phrase.',
                 'The experimental result begins in one block and',
                 'ends in a second block with the same final phrase.']
        page = {'text': '\n'.join(texts), 'blocks': [
            {'text': text, 'rect': {'x': .1, 'y': n / 10, 'width': .8, 'height': .05}}
            for n, text in enumerate(texts)]}
        source = texts[1] + ' ' + texts[2]
        self.assertEqual(_locate({'sourceText': source, 'endQuote': 'the same final phrase.'}, page)[2], {1, 2})

    def test_page_prompt_preserves_source_names_and_visual_uncertainty(self):
        english = page_prompt('en')
        chinese = page_prompt('zh')
        self.assertIn('exact drug, compound, intervention and abbreviation names', english)
        self.assertIn('comparison cannot be determined', english)
        self.assertIn('statistical values or significance from labels', english)
        self.assertIn('Do not infer the direction or magnitude', english)
        self.assertIn('Do not introduce a cross-figure or cross-table relationship', english)
        self.assertIn('不得替换为相关但不同的名称', chinese)
        self.assertIn('无法判断时直接写明无法确定', chinese)
        self.assertIn('不得从图像内的统计标签', chinese)
        self.assertIn('不得仅凭图像推断生物学比较的方向', chinese)
        self.assertIn('不得仅因主题相似而建立跨图或跨表关系', chinese)

    def test_overview_prompt_preserves_conflicts_and_table_identifiers(self):
        self.assertIn('exact figure and table identifiers', overview_prompt('en'))
        self.assertIn('does not mean every figure supports every claim', overview_prompt('en'))
        self.assertIn('spacing between sessions', overview_prompt('en'))
        self.assertIn('state the conflict there too', overview_prompt('en'))
        self.assertIn('not being reported from proof it was not performed', overview_prompt('en'))
        self.assertIn('deduplicate repeated findings', overview_prompt('en'))
        self.assertIn('roughly 2500 output tokens', overview_prompt('en'))
        self.assertIn('mainFindings at most 8 items', overview_prompt('en'))
        self.assertIn('Preserve the subject set of every piece of evidence', overview_prompt('en'))
        self.assertIn('instead of saying it proves absence of an artifact', overview_prompt('en'))
        self.assertIn('A value absent from the supplied transcription is not evidence', overview_prompt('en'))
        self.assertIn('not that no value was reported', overview_prompt('en'))
        self.assertIn('describe the same document', overview_prompt('en'))
        self.assertIn('incomplete coverage, not a contradiction', overview_prompt('en'))
        self.assertIn('Treat a unit\'s statement that the unit itself does not report', overview_prompt('en'))
        self.assertIn('must not be attributed to a broader compound class', overview_prompt('en'))
        self.assertIn('原始图号和表号', overview_prompt('zh'))
        self.assertIn('不表示每张图都支持每一项结论', overview_prompt('zh'))
        self.assertIn('不得把隔日改为连续', overview_prompt('zh'))
        self.assertIn('也必须同时说明冲突', overview_prompt('zh'))
        self.assertIn('区分方法未报告与确定没有实施', overview_prompt('zh'))
        self.assertIn('去重重复的发现', overview_prompt('zh'))
        self.assertIn('约2500 token', overview_prompt('zh'))
        self.assertIn('mainFindings最多8条', overview_prompt('zh'))
        self.assertIn('保留每项证据的对象范围', overview_prompt('zh'))
        self.assertIn('不得写成“证明”不存在伪影', overview_prompt('zh'))
        self.assertIn('不等于论文未报告', overview_prompt('zh'))
        self.assertIn('不得写成未报告', overview_prompt('zh'))
        self.assertIn('都来自同一篇论文', overview_prompt('zh'))
        self.assertIn('不是矛盾、另一项研究或另一组材料', overview_prompt('zh'))
        self.assertIn('只是该单元的局部限制', overview_prompt('zh'))
        self.assertIn('不得推广到更广的化合物类别', overview_prompt('zh'))

    def test_units_prompt_distinguishes_source_from_model_interpretation(self):
        self.assertIn('heading, summary, analysis, evidence and limitations are model-generated', units_prompt('en'))
        self.assertIn('do not repeat an unsupported association', units_prompt('en'))
        self.assertIn('not being reported from proof it was not performed', units_prompt('en'))
        self.assertIn('heading、summary、analysis、evidence和limitations均由模型生成', units_prompt('zh'))
        self.assertIn('不得仅因这些字段提到某种关联就照搬', units_prompt('zh'))
        self.assertIn('区分方法未报告与确定没有实施', units_prompt('zh'))

    def test_page_result_generates_headings_and_verified_rectangles(self):
        page = {
            "page": 4,
            "text": "Introduction: This study tests the hypothesis that treatment changes the measured cellular response across matched groups. Results: Treated cells increased by 20% at the prespecified measurement time, while control cells remained near baseline across all matched comparisons.",
            "blocks": [
                {"text": "Introduction: This study tests the hypothesis that treatment changes the measured cellular response across matched groups.", "rect": {"x": .1, "y": .1, "width": .8, "height": .1}},
                {"text": "Results: Treated cells increased by 20% at the prespecified measurement time, while control cells remained near baseline across all matched comparisons.", "rect": {"x": .1, "y": .3, "width": .8, "height": .1}},
            ],
        }
        value = {
            "page": 4,
            "pageKind": "content",
            "pageSummary": "The page states the hypothesis and the measured increase.",
            "items": [
                {"kind": "paragraph", "heading": "研究假设", "sourceText": page["blocks"][0]["text"],
                 "summary": "提出研究假设。", "analysis": "本段建立后文需要检验的核心假设。它明确比较处理和对照条件，并把测量反应作为结果变量，为后续证据审查提供方向。",
                 "evidence": "", "limitations": [], "status": "author_stated"},
                {"kind": "paragraph", "heading": "处理组结果", "sourceText": page["blocks"][1]["text"],
                 "summary": "处理组出现变化。", "analysis": "本段报告处理组增加 20%，但未在本段给出统计检验。读者仍需结合样本量和误差范围判断这一变化是否稳定。",
                 "evidence": "增加 20%", "limitations": ["缺少统计检验"], "status": "reported_result"},
            ],
        }
        result = validate_page_result(value, page)
        self.assertEqual([item["heading"] for item in result["items"]], ["研究假设", "处理组结果"])
        self.assertTrue(all(item["locationStatus"] == "located_quote" for item in result["items"]))
        self.assertTrue(all(item["rects"] for item in result["items"]))
        self.assertEqual(result["items"][1]["limitations"], ["缺少统计检验"])

    def test_unverified_quote_is_kept_as_page_only_and_warned(self):
        page = {"page": 2, "text": "The source text is present and reports a measured comparison across matched study groups.", "blocks": []}
        value = {
            "page": 2,
            "pageKind": "content",
            "items": [{"kind": "paragraph", "heading": "Claim",
                       "sourceText": "A paraphrase that differs from the complete source statement, omits part of the measured result, and is not a direct copy of the page.", "analysis": "This detailed interpretation explains the reported comparison and separates the observed result from any broader inference. It also notes that the missing source wording prevents a complete transcription match.",
                       "status": "inferred"}],
        }
        result = validate_page_result(value, page)
        self.assertEqual(result["items"][0]["locationStatus"], "page_only")
        self.assertEqual(result["items"][0]["rects"], [])
        self.assertTrue(result["warnings"])

    def test_exact_start_and_end_anchors_locate_a_transcribed_paragraph(self):
        page = {
            "page": 3,
            "text": "The first measured group received the control intervention. The second measured group received active treatment.",
            "blocks": [{"text": "The first measured group received the control intervention. The second measured group received active treatment.",
                        "rect": {"x": .1, "y": .2, "width": .8, "height": .2}}],
        }
        result = validate_page_result({
            "page": 3, "pageKind": "content",
            "items": [{"kind": "paragraph", "heading": "Study groups",
                       "sourceText": "Participants were divided into a control group and an active-treatment group, and both groups completed the same prespecified measurement schedule.",
                       "startQuote": "The first measured group received the control intervention",
                       "endQuote": "The second measured group received active treatment",
                       "summary": "The page names two groups.",
                       "analysis": "The paragraph identifies the control and active-treatment groups and provides the basis for later comparison.",
                       "status": "author_stated"}],
        }, page)
        item = result["items"][0]
        self.assertEqual(item["locationStatus"], "located_quote")
        self.assertFalse(item["sourceVerified"])
        self.assertTrue(item["rects"])
        self.assertTrue(any("按部分文字定位" in warning["message"] for warning in result["warnings"]))

    def test_reference_page_may_have_no_paragraph_items(self):
        page = {"page": 12, "text": "References", "blocks": []}
        result = validate_page_result({
            "page": 12, "pageKind": "references", "pageSummary": "Reference list.",
            "items": [], "warnings": [],
        }, page)
        self.assertEqual(result["pageKind"], "references")
        self.assertEqual(result["items"], [])

    def test_mixed_page_filters_reference_list_but_keeps_scientific_text(self):
        body = 'The reference value is measured in the control group, and the treated group shows a reproducible increase in the measured response.'
        references = 'Smith A, Jones B. Reference study on the response. Journal of Results 2020;12:1-9. ' * 2
        page = {'page': 4, 'text': body + ' ' + references,
                'blocks': [{'text': text, 'rect': {'x': .1, 'y': y, 'width': .8, 'height': .1}}
                           for text,y in ((body,.2),(references,.4))]}
        def item(heading, source):
            return {'kind':'paragraph','heading':heading,'sourceText':source,'status':'reported_result',
                    'analysis':'This paragraph presents enough details for a meaningful interpretation of the reported observations.'}
        result = validate_page_result({'page':4,'pageKind':'content','items':[
            item('Reference values in the control group', body), item('参考文献列表（Smith至Jones）', references)]}, page)
        self.assertEqual([entry['heading'] for entry in result['items']], ['Reference values in the control group'])
        self.assertEqual(result['items'][0]['id'], 'P4-I1')

    def test_bibliography_continuation_in_columns_is_excluded(self):
        from full_read import bibliography_item
        self.assertTrue(bibliography_item({'kind': 'paragraph', 'heading': '左栏参考文献续（上）'}))
        self.assertTrue(bibliography_item({'kind': 'paragraph', 'heading': '右栏参考文献续（上）'}))
        self.assertTrue(bibliography_item({'kind': 'paragraph', 'heading': '参考文献1–6：发酵食品背景'}))
        self.assertFalse(bibliography_item({'kind': 'paragraph', 'heading': 'Reference values in the control group'}))

    def test_cross_page_continuation_warning_is_preserved_for_review(self):
        pagetext = ("A complete continuation appears on this page and reports the measured result for the treatment group, "
                    "while the control condition remains available for comparison across the same experiment.")
        page = {"page": 2, "text": pagetext, "blocks": []}
        result = validate_page_result({
            "page": 2, "pageKind": "content", "pageSummary": "Continuation.",
            "items": [{"kind": "paragraph", "heading": "Continued result",
                       "sourceText": pagetext,
                       "startQuote": "A complete continuation",
                       "endQuote": "reports the measured result",
                       "summary": "A result continues.",
                       "analysis": "The paragraph completes the result carried over from the previous page and provides enough information to interpret the experiment.",
                       "status": "reported_result"}],
            "warnings": ["The sentence is truncated at the page boundary.", "句子在页面边缘中断，位于下一页。"],
        }, page)
        self.assertTrue(any("中断" in item["message"] for item in result["warnings"]))
        self.assertTrue(any("truncated" in item["message"] for item in result["warnings"]))

    def test_scientific_truncation_is_preserved_in_page_and_unit(self):
        text = "The researchers used a truncated protein construct to evaluate its function in matched experimental groups across multiple conditions."
        analysis = "The truncated protein retained activity in this comparison. The next page reports the control measurement and associated limitations."
        page = {"page": 1, "text": text, "blocks": []}
        result = validate_page_result({"pageKind": "content", "pageSummary": analysis,
            "items": [{"kind": "paragraph", "heading": "Protein construct", "sourceText": text,
                       "summary": "A truncated protein retained activity.", "analysis": analysis,
                       "limitations": ["The truncated protein was tested in vitro."],
                       "status": "reported_result"}],
            "warnings": ["A truncated protein was tested without a control."]}, page)
        item = result["items"][0]
        self.assertEqual(item["analysis"], analysis)
        self.assertIn("truncated protein", item["summary"])
        self.assertIn("truncated protein", item["limitations"][0])
        self.assertTrue(any("truncated protein" in warning["message"] for warning in result["warnings"]))
        units, _, _ = validate_units({"units": [{"unitType": "experiment", "heading": "Protein truncation",
            "result": "A truncated protein retained activity.", "interpretation": analysis,
            "sourceItemIds": [item["id"]], "status": "reported_result"}]}, [item])
        self.assertIn("truncated protein", units[0]["result"])
        self.assertEqual(units[0]["interpretation"], analysis)

    def test_page_validation_keeps_decimal_values_exact(self):
        text = ('The control was 93.69% ± 2.21%, compared with 71.31% ± 8.33% in the treated group at 0.3% NaCl. '
                'The measured comparison is reported with its units and group labels.')
        page = {'page':1,'text':text,'blocks':[]}
        result = validate_page_result({'page':1,'pageKind':'content','pageSummary':text,
            'items':[{'kind':'paragraph','heading':'Measured results','sourceText':text,
                      'summary':text,'analysis':text,'status':'reported_result'}]},page)
        for value in ('93.69%', '2.21%', '71.31%', '8.33%', '0.3%'):
            self.assertIn(value,result['pageSummary'])
            self.assertIn(value,result['items'][0]['analysis'])

    def test_overview_preserves_long_fields_and_all_findings_and_caveats(self):
        long_text = "The measured value needs source review. " * 50
        conflict = "The text reports 50 mM, while Table 3 reports 0.6 mM."
        result = validate_overview({
            "oneSentence": "  A   result. ",
            "researchQuestion": long_text,
            "studyDesign": long_text,
            "mainFindings": ["Finding"] * 10 + [conflict],
            "argumentMap": ["Step"] * 20 + [long_text],
            "limitations": ["Limit"] * 10 + [conflict],
        })
        self.assertEqual(result["oneSentence"], "A result.")
        self.assertEqual(result["researchQuestion"], long_text.strip())
        self.assertEqual(result["studyDesign"], long_text.strip())
        self.assertEqual(result["mainFindings"][-1], conflict)
        self.assertEqual(len(result["argumentMap"]), 21)
        self.assertEqual(result["argumentMap"][-1], long_text.strip())
        self.assertEqual(result["limitations"][-1], conflict)

    def test_overview_formats_structured_argument_as_readable_text(self):
        result = validate_overview({"oneSentence": "Finding", "argumentMap": [
            {"claim": "Treatment changed haemolysis.", "evidence": "Measured at 0.3% NaCl.",
             "warrant": "The groups differed."}]})
        self.assertEqual(result["argumentMap"], [
            "claim: Treatment changed haemolysis.; evidence: Measured at 0.3% NaCl.; warrant: The groups differed."])

    def test_overview_drops_unverified_input_absence_clauses(self):
        result = validate_overview({
            "oneSentence": "Effect observed.",
            "mainFindings": ["A；输入未提供分组例数。", "B（Fig. 1，未给P值）。", "C。正文未给出具体 P 值。",
                              "D；Fig. 1E名单在输入中截断，完整名单无法核实。",
                              "E；加倍成分不显著影响其他菌株。",
                              "F；其他菌株无显著影响。",
                              "结论：packing引起溶血增加。"],
            "limitations": ["输入未提供统计细节。", "样本仅2名供体；输入中缺乏效应量。",
                            "供体间变异未在输入中量化；Fig. 3本页缺少图注，误差棒无法核实。",
                            "Table S4未作为独立条目提供，无法核对其内容。",
                            "摘要仅报告一个浓度，无法评估完整EOF曲线；其余浓度结果在所给材料中缺失。",
                            "EOF方法中“最大溶血（0%）作为100%”表述自相矛盾。",
                            "多组比较未作多重比较校正；配对设计未利用配对信息。",
                            "该建议未评估AA剂量、给药时程与长期效果。"],
        })
        self.assertEqual(result["mainFindings"], ["A", "B（Fig. 1）", "C", "D", "E；加倍成分未见明显影响其他菌株",
                                                  "F；其他菌株无明显影响",
                                                  "作者结论：packing引起溶血增加"])
        self.assertEqual(result["limitations"], ["样本仅2名供体", "供体间变异未量化",
                                                 "摘要仅报告一个浓度",
                                                 "EOF方法中“最大溶血（0%）作为100%”的括注含义需核对",
                                                 "多组比较未报告多重比较校正，是否实施无法确定；配对设计未说明是否利用配对信息",
                                                 "该建议仅评估单一AA剂量和给药时程，未评估长期效果"])

    def test_page_source_verification_uses_complete_transcription(self):
        source = ('A measured treatment and control comparison. ' * 150).strip()
        false_tail = source + ' Invented ending.'
        page = {'page': 1, 'text': source, 'blocks': []}
        def item(text):
            return {'kind': 'paragraph', 'heading': 'Long result', 'sourceText': text,
                    'analysis': 'The result compares the measured responses in treatment and control groups over the full experiment.',
                    'status': 'reported_result', 'limitations': ['Limitation'] * 7 + ['Last limitation']}
        result = validate_page_result({'items': [item(source), item(false_tail)]}, page)
        self.assertEqual(result['items'][0]['sourceText'], source)
        self.assertTrue(result['items'][0]['sourceVerified'])
        self.assertEqual(result['items'][1]['sourceText'], false_tail)
        self.assertFalse(result['items'][1]['sourceVerified'])
        self.assertEqual(result['items'][0]['limitations'][-1], 'Last limitation')

    def test_unit_validation_keeps_long_result_and_late_limitation(self):
        source = {'id': 'P1-I1', 'page': 1, 'kind': 'paragraph', 'heading': 'Result'}
        result = 'A measured comparison. ' * 150 + 'Conflicting value needs review.'
        units, coverage, _ = validate_units({'units': [{
            'unitType': 'experiment', 'heading': 'Result', 'result': result,
            'interpretation': 'This interpretation describes a measured comparison with two experimental groups and a defined outcome.',
            'sourceItemIds': ['P1-I1'], 'status': 'reported_result',
            'limitations': ['Limit'] * 8 + ['Conflicting value needs review.']}]}, [source])
        self.assertEqual(units[0]['result'], result)
        self.assertEqual(units[0]['limitations'][-1], 'Conflicting value needs review.')
        self.assertEqual(coverage['missingItemIds'], [])

    def test_conflict_candidates_require_two_matching_quotations_and_values(self):
        items = [dict(id='I1', page=8, text='CDMA contains 0.6 mM lactate.'),
                 dict(id='I2', page=8, text='CDMA was supplemented with 50 mM lactate.')]
        candidate = dict(quantity='CDMA lactate', values=['0.6 mM', '50 mM'], evidence=[
            dict(itemId='I1', quote='CDMA contains 0.6 mM lactate.'),
            dict(itemId='I2', quote='CDMA was supplemented with 50 mM lactate.')])
        self.assertEqual(len(validate_conflicts({'conflicts': [candidate]}, items)), 1)
        candidate['evidence'][1]['quote'] = 'CDMA was supplemented with 500 mM lactate.'
        self.assertEqual(validate_conflicts({'conflicts': [candidate]}, items), [])

    def test_conflict_candidates_reject_duplicate_or_unverified_evidence(self):
        items = [dict(id='I1', page=1, text='The report gives 0.6 mM and 50 mM.'),
                 dict(id='I2', page=2, text='The table gives 0.6 mM in the same medium.')]
        first = dict(itemId='I1', quote=items[0]['text'])
        second = dict(itemId='I2', quote=items[1]['text'])
        candidate = dict(quantity='concentration', values=['0.6 mM', '50 mM'],
                         evidence=[first, dict(first)])
        self.assertEqual(validate_conflicts({'conflicts': [candidate]}, items), [])
        candidate['evidence'] = [first, second, dict(itemId='I2', quote='Invented quotation 50 mM.')]
        self.assertEqual(validate_conflicts({'conflicts': [candidate]}, items), [])
        candidate['evidence'] = [first, second]
        self.assertEqual(len(validate_conflicts({'conflicts': [candidate]}, items)), 1)
        items[0]['text'] = '0.6 mM and 50 mM ' + 'a' * 1000
        candidate['evidence'][0] = dict(itemId='I1', quote=items[0]['text'][:1000] + ' invented suffix')
        self.assertEqual(validate_conflicts({'conflicts': [candidate]}, items), [])

    def test_conflict_values_do_not_match_parts_of_other_numbers(self):
        items = [dict(id='I1', page=1, text='Concentration was 10.6 mM and change was -50.'),
                 dict(id='I2', page=2, text='Concentration was 500 mM and change was 1e50.')]
        evidence = [dict(itemId=item['id'], quote=item['text']) for item in items]
        for values in (['0.6 mM', '500 mM'], ['50', '10.6 mM'], ['10', '500 mM'],
                       ['1', '500 mM']):
            with self.subTest(values=values):
                self.assertEqual(validate_conflicts({'conflicts': [dict(quantity='value', values=values,
                                                                        evidence=evidence)]}, items), [])
        candidate = dict(quantity='concentration', values=['10.6 mM', '500 mM'], evidence=evidence)
        self.assertEqual(len(validate_conflicts({'conflicts': [candidate]}, items)), 1)
        candidate['values'] = ['-50', '1e50']
        self.assertEqual(len(validate_conflicts({'conflicts': [candidate]}, items)), 1)

    def test_units_merge_source_items_and_reject_unknown_ids(self):
        items = [
            {"id": "P1-I1", "page": 1, "kind": "paragraph", "heading": "Question", "figureNumber": ""},
            {"id": "P2-I1", "page": 2, "kind": "paragraph", "heading": "Result", "figureNumber": ""},
            {"id": "P2-I2", "page": 2, "kind": "figure", "heading": "Figure 1", "figureNumber": "1"},
        ]
        units, coverage, warnings = validate_units({"units": [{
            "unitType": "experiment", "heading": "Experiment 1", "question": "Q",
            "design": "Groups", "result": "The measured comparison is available. 对照信息在页面截断处未给出。",
            "interpretation": "This unit combines the question, design, result and supporting figure into one complete experiment.",
            "figureInterpretation": "Figure 1 supports the reported comparison.",
            "figureItemIds": ["P2-I2", "UNKNOWN"], "sourceItemIds": ["P1-I1", "P2-I1"],
            "limitations": [], "status": "reported_result",
        }]}, items)
        self.assertEqual(units[0]["id"], "U1")
        self.assertEqual(units[0]["unitType"], "experiment")
        self.assertEqual(units[0]["heading"], "Experiment 1")
        self.assertEqual(units[0]["question"], "Q")
        self.assertEqual(units[0]["design"], "Groups")
        self.assertIn("measured comparison", units[0]["result"])
        self.assertEqual(units[0]["sourceItemIds"], ["P1-I1", "P2-I1", "P2-I2"])
        self.assertEqual(units[0]["pages"], [1, 2])
        self.assertEqual(units[0]["figureInterpretation"], "Figure 1 supports the reported comparison.")
        self.assertEqual(units[0]["limitations"], [])
        self.assertEqual(units[0]["status"], "reported_result")
        self.assertEqual(units[0]["figureNumbers"], ["1"])
        self.assertIn("对照信息在页面截断处未给出", units[0]["result"])
        self.assertEqual(coverage["missingItemIds"], [])
        self.assertEqual(warnings, [])

    def test_units_warn_when_reported_figure_is_not_linked(self):
        items = [
            dict(id='I1', page=1, kind='paragraph', heading='Result', figureNumber=''),
            dict(id='F1', page=1, kind='figure', heading='Figure 1', figureNumber='1'),
            dict(id='F2', page=2, kind='caption', heading='Figure 2', figureNumber='Figure 2'),
        ]
        raw = dict(unitType='experiment', heading='Experiment', status='reported_result',
                   result='Figure 2 reports the treated groups.',
                   figureInterpretation='Figure 1 shows the untreated baseline.',
                   interpretation='This experiment reports a treated comparison and an untreated baseline for review.',
                   sourceItemIds=['I1'], figureItemIds=['F1'])
        units, _, warnings = validate_units({'units': [raw]}, items)
        self.assertEqual(units[0]['sourceWarnings'],
                         ['结果或图表解读提到 Figure 2，但单元没有关联对应图表来源；请核对图表关联。'])
        self.assertTrue(any('Figure 2' in warning and 'Experiment' in warning for warning in warnings))
        raw['figureItemIds'] = ['F2']
        raw['figureInterpretation'] = 'Figure 2 shows the treated groups.'
        units, _, warnings = validate_units({'units': [raw]}, items)
        self.assertEqual(units[0]['sourceWarnings'], [])

    def test_reference_warning_scans_all_unit_fields_and_linked_headings(self):
        items = [
            {'id': 'P1-I1', 'page': 1, 'kind': 'paragraph', 'heading': 'Result',
             'figureNumber': ''},
            {'id': 'P1-I2', 'page': 1, 'kind': 'caption',
             'heading': 'Fig. 2 caption', 'sourceText': 'Fig. 2. Measured response.',
             'figureNumber': ''},
        ]
        base = {
            'unitType': 'experiment', 'heading': 'Measured response',
            'interpretation': 'This unit compares the measured treatment and control response in the supplied source.',
            'sourceItemIds': ['P1-I1'], 'figureItemIds': ['P1-I2'],
            'status': 'reported_result',
        }
        units, _, _ = validate_units({'units': [base]}, items)
        self.assertEqual(units[0]['sourceWarnings'], [])
        for field in ('question', 'design', 'interpretation', 'limitations'):
            with self.subTest(field=field):
                value = dict(base, figureItemIds=[])
                message = ('Review Table 3 against the measured treatment comparison and source '
                           'before drawing a conclusion from this experiment.')
                value[field] = [message] if field == 'limitations' else message
                units, _, _ = validate_units({'units': [value]}, items)
                self.assertTrue(any('Table 3' in warning for warning in units[0]['sourceWarnings']))

    def test_units_warn_when_methods_item_is_mixed_with_figure(self):
        items = [dict(id='I1', page=1, kind='paragraph', heading='Result'),
                 dict(id='M1', page=6, kind='paragraph', heading='HBEC3-KT细胞系培养与传代'),
                 dict(id='F1', page=7, kind='caption', heading='Fig. 3 图注', figureNumber='Fig. 3')]
        raw = dict(unitType='experiment', heading='Experiment', status='reported_result',
                   interpretation='This unit combines a figure caption with a methods paragraph for review.',
                   sourceItemIds=['I1', 'M1'], figureItemIds=['F1'])

        units, _, warnings = validate_units({'units': [raw]}, items)
        self.assertEqual(len(units[0]['sourceWarnings']), 1)
        self.assertIn('HBEC3-KT细胞系培养与传代', units[0]['sourceWarnings'][0])
        self.assertTrue(any('方法来源' in warning for warning in warnings))

        raw['figureItemIds'] = []
        units, _, _ = validate_units({'units': [raw]}, items)
        self.assertEqual(units[0]['sourceWarnings'], [])
        raw['figureItemIds'] = ['F1']
        raw['sourceItemIds'] = ['I1']
        units, _, _ = validate_units({'units': [raw]}, items)
        self.assertEqual(units[0]['sourceWarnings'], [])

    def test_attach_unit_reference_warnings_adds_methods_mixing_warning(self):
        value = {'items': [
                   dict(id='M1', page=6, kind='paragraph', heading='慢病毒转导方法'),
                   dict(id='F1', page=7, kind='caption', heading='Fig. 3 caption', figureNumber='Fig. 3')],
                 'units': [dict(heading='Experiment', sourceItemIds=['M1', 'F1'],
                                figureItemIds=['F1'])]}
        attach_unit_reference_warnings(value)
        self.assertEqual(len(value['units'][0]['sourceWarnings']), 1)
        self.assertIn('慢病毒转导方法', value['units'][0]['sourceWarnings'][0])

    def test_units_warn_when_figure_only_reference_is_shared(self):
        items = [dict(id='I1', page=1, kind='paragraph'),
                 dict(id='I2', page=1, kind='paragraph'),
                 dict(id='F1', page=1, kind='figure', figureNumber='1')]
        def unit(source):
            return dict(unitType='experiment', heading='Experiment', status='reported_result',
                        interpretation='This is a detailed interpretation of the experiment and its supporting figure.',
                        sourceItemIds=[source], figureItemIds=['F1'])
        units, coverage, warnings = validate_units({'units': [unit('I1'), unit('I2')]}, items)
        self.assertEqual(coverage['assigned'], 3)
        self.assertTrue(all('F1' in unit['sourceItemIds'] for unit in units))
        self.assertTrue(any('F1' in warning for warning in warnings))

    def test_store_keeps_runs_and_returns_latest_for_current_pdf_and_language(self):
        store = FullReadStore(self.db, threading.RLock())
        first = {"status": "done", "overview": {"oneSentence": "First"}}
        second = {"status": "running", "overview": None}
        store.save("run-1", "PAPER", "version", "zh", first, created=1)
        store.save("run-2", "PAPER", "version", "zh", second, created=2)
        latest = store.get("PAPER", "version", "zh")
        self.assertEqual(latest["runId"], "run-2")
        self.assertEqual(latest["status"], "running")
        count = self.db.execute("SELECT COUNT(*) FROM full_reads").fetchone()[0]
        self.assertEqual(count, 2)
        self.assertIsNone(store.get("PAPER", "version", "en"))

    def test_store_returns_newer_run_when_creation_times_match(self):
        store = FullReadStore(self.db, threading.RLock())
        store.save('cancelled', 'PAPER', 'version', 'zh', {'status': 'cancelled'}, created=10)
        store.save('resumed', 'PAPER', 'version', 'zh', {'status': 'done'}, created=10)
        self.assertEqual(store.get('PAPER', 'version', 'zh')['runId'], 'resumed')
        store.save('cancelled', 'PAPER', 'version', 'zh', {'status': 'cancelled'}, created=10)
        self.assertEqual(store.get('PAPER', 'version', 'zh')['runId'], 'resumed')

    def test_historical_lookup_is_explicit_and_scoped(self):
        store = FullReadStore(self.db, threading.RLock())
        store.save('old', 'PAPER', 'version', 'zh', {'status': 'partial', 'units': [{'id': 'U1'}]}, created=1)
        self.db.execute('UPDATE full_reads SET prompt_version=? WHERE run_id=?', (PROMPT_VERSION - 1, 'old'))
        self.db.commit()
        self.assertIsNone(store.get('PAPER', 'version', 'zh'))
        self.assertIsNone(store.get('PAPER', 'version', 'zh', usable=True))
        self.assertEqual(store.get('PAPER', 'version', 'zh', historical=True)['runId'], 'old')
        self.assertIsNone(store.get('PAPER', 'other-pdf', 'zh', historical=True))
        self.assertIsNone(store.get('PAPER', 'version', 'en', historical=True))
        store.save('current', 'PAPER', 'version', 'zh', {'status': 'running'}, created=2)
        self.assertEqual(store.get('PAPER', 'version', 'zh')['runId'], 'current')

    def test_store_flags_legacy_source_limit_without_rewriting_history(self):
        store = FullReadStore(self.db, threading.RLock())
        old = {'id': 'P1-I1', 'page': 1, 'sourceText': 'a' * 5000, 'sourceVerified': True}
        current = {'id': 'P2-I1', 'page': 2, 'sourceText': 'b' * 5000, 'sourceVerified': True}
        value = {'status': 'partial', 'pages': [
            {'page': 1, 'items': [old], 'warnings': []},
            {'page': 2, 'sourceValidationVersion': 2, 'items': [current], 'warnings': []}],
            'items': [old, current], 'warnings': []}
        store.save('run', 'PAPER', 'version', 'zh', value)
        loaded = store.get('PAPER', 'version', 'zh')['value']
        self.assertFalse(loaded['items'][0]['sourceVerified'])
        self.assertTrue(loaded['pages'][0]['sourceTextMayBeTruncated'])
        self.assertTrue(loaded['items'][1]['sourceVerified'])
        self.assertNotIn('sourceTextMayBeTruncated', loaded['pages'][1])
        self.assertEqual(len(loaded['warnings']), 1)
        persisted = json.loads(self.db.execute('SELECT value FROM full_reads').fetchone()[0])
        self.assertTrue(persisted['items'][0]['sourceVerified'])
        self.assertEqual(persisted['warnings'], [])


if __name__ == "__main__":
    unittest.main()
